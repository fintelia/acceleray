#version 330

#extension GL_ARB_explicit_uniform_location : enable
#extension GL_ARB_shader_image_load_store : enable

const int DIFFUSE_SHADER = 1;
const int MIRROR_SHADER = 2;

out vec4 OutputColor;

struct Light {
    vec3 position;
    vec3 color;
};
struct Sphere {
    vec3 position;
    float radius;
    vec3 color;
    int shader;
};
struct Ray {
    vec3 origin;
    vec3 direction;
};
struct Intersection {
    int object;
    float distance;
    vec3 normal;
};
struct PendingRay {
    Ray ray;
    vec3 weight;
    int depth;
};

layout(location = 0) uniform vec2 windowSize = vec2(640, 480);
restrict layout(rgba32f, location = 1) uniform image2D image;
layout(location = 2) uniform vec4 rand;

layout(location = 16) uniform int numLights = 1;
layout(location = 17) uniform int numSpheres = 2;

/*layout(location = 64) uniform*/ Light lights[8];
/*layout(location = 128) uniform*/ Sphere spheres[8];

Intersection sphereIntersect(Ray ray) {
    Intersection ret;
    ret.object = -1;

    for(int i = 0; i < numSpheres; i++) {
        vec3 offset = ray.origin - spheres[i].position;

        float b = 2 * dot(ray.direction, offset);
        float c = dot(offset, offset) - spheres[i].radius * spheres[i].radius;

        float det = b * b / 4 - c;
        float t = -b / 2;
        if(det < 0) continue;

        float sqrt_det = sqrt(det);
        if(t - sqrt_det > 0) {
            t -= sqrt_det;
        } else {
            t += sqrt_det;
        }

        if(t > 0.0001 && (t < ret.distance || ret.object == -1)) {
            ret.object = i;
            ret.distance = t;
        }
    }
    if(ret.object != -1) {
        ret.normal = normalize(ray.origin + ray.direction * ret.distance -
                               spheres[ret.object].position);
    }
    return ret;
}
vec3 shade(int shader, vec3 color, vec3 point, vec3 normal,
           out float reflect_weight, out float refract_weight) {
    if(shader == DIFFUSE_SHADER) {
        vec3 diffuseColor = vec3(0);
        for(int i = 0; i < numLights; i++) {
            vec3 lightDirection = normalize(lights[i].position - point);
            Ray shadowRay = Ray(point + 0.01 * lightDirection, lightDirection);

            if(sphereIntersect(shadowRay).object == -1) {
                diffuseColor += color * dot(normal, lightDirection);
            }
        }

		reflect_weight = 0;
		refract_weight = 0;
        return mix(diffuseColor, color, 0.4);
    } else if(shader == MIRROR_SHADER) {
		vec3 diffuseColor = vec3(0);
        for(int i = 0; i < numLights; i++) {
            vec3 lightDirection = normalize(lights[i].position - point);
            Ray shadowRay = Ray(point + 0.01 * lightDirection, lightDirection);

            if(sphereIntersect(shadowRay).object == -1) {
                diffuseColor += color * dot(normal, lightDirection);
            }
        }
		
		reflect_weight = 1;
		refract_weight = 0;
		return mix(diffuseColor, color, 0.4);
	}
}

// vec3 castRay(Ray ray) {
//     Intersection s = sphereIntersect(ray);
//     Intersection h = heightmapIntersect(ray);
//     if(s.object == -1 && h.object == -1) return vec3(0);
//     int shader;
//     vec3 color, point, normal;
//     if(s.object != -1 && (h.object == -1 || s.distance < h.distance)) {
//         shader = spheres[s.object].shader;
//         color = spheres[s.object].color;
//         point = ray.origin + ray.direction * s.distance;
//         normal = s.normal;
//     } else {
//         shader = heightmaps[h.object].shader;
//         color = heightmaps[h.object].color;
//         point = ray.origin + ray.direction * h.distance;
//         normal = h.normal;
//     }
// 	float a, b;
//     return shade(shader, color, point, normal, a, b);
// }

void main() {
    spheres[0].position = vec3(0.5, 0.5, 2);
    spheres[0].color = vec3(1, 0, 0);
    spheres[0].radius = 0.4;
    spheres[0].shader = DIFFUSE_SHADER;

    spheres[1].position = vec3(-1, -1, 4);
    spheres[1].color = vec3(0, 1, 0);
    spheres[1].radius = 1.0;
    spheres[1].shader = MIRROR_SHADER;

    lights[0].position = vec3(1, 1, 0);
    lights[0].color = vec3(1);

    vec2 position = vec2(
        (gl_FragCoord.x - windowSize.x / 2 + rand.x - 0.5) / (windowSize.y / 2),
        (gl_FragCoord.y - windowSize.y / 2 + rand.y - 0.5) /
            (windowSize.y / 2));

    // Initialize view
    vec3 eye = vec3(0, 2, -2);
    vec3 target = vec3(position.x, position.y + 1, 0);
    Ray initialRay = Ray(eye, normalize(target - eye));

	// Initialize ray tracking data-structure
    const int MAX_PENDING_RAYS = 16;
    PendingRay pendingRays[MAX_PENDING_RAYS];
    int numPendingRays = 1;
    pendingRays[0] = PendingRay(initialRay, vec3(1, 1, 1), 1);

	// Trace rays
    vec4 color = vec4(0, 0, 0, 1);
    while(numPendingRays > 0) {
		PendingRay r = pendingRays[--numPendingRays];
		
        Intersection s = sphereIntersect(r.ray);
        if(s.object == -1) break;

		float reflect_weight, refract_weight;
        vec3 point = r.ray.origin + r.ray.direction * s.distance;
        vec3 shadedColor =
            shade(spheres[s.object].shader, spheres[s.object].color, point,
                  s.normal, reflect_weight, refract_weight);

		if(reflect_weight > 0 && r.depth < 4){
			vec3 rr = reflect(r.ray.direction, s.normal);
            pendingRays[numPendingRays++] = PendingRay(
                Ray(point, rr), reflect_weight * r.weight, r.depth + 1);
        }
		if(refract_weight > 0 && r.depth < 4){
			vec3 rr = refract(r.ray.direction, s.normal, 1.0 / 1.5);
            pendingRays[numPendingRays++] = PendingRay(
                Ray(point, rr), refract_weight * r.weight, r.depth + 1);
        }
		
        color.rgb += r.weight * shadedColor;
    }

    // Average color with past samples from the same pixel
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 colorSum = imageLoad(image, coord) + color;
    imageStore(image, coord, colorSum);
    OutputColor = vec4(colorSum.rgb / colorSum.a, 1);
}
