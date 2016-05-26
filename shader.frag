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
// struct Heightmap {
//     vec3 position;
//     vec3 size;
//     //    sampler2D texture;
//     vec3 color;
//     int shader;
// };
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
//layout(location = 18) uniform int numHeightmaps = 1;

/*layout(location = 64) uniform*/ Light lights[8];
/*layout(location = 128) uniform*/ Sphere spheres[8];
///*layout(location = 192) uniform*/ Heightmap heightmaps[8];

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
// Intersection heightmapIntersect(Ray ray) {
//     Intersection ret;
//     ret.object = -1;

//     for(int i = 0; i < numHeightmaps; i++) {
//         vec3 bmin = heightmaps[i].position;
//         vec3 bmax = heightmaps[i].position + heightmaps[i].size;

//         if(ray.origin.y < bmin.y) {
//             continue;
//         } else if(ray.origin.y > bmax.y && ray.direction.y >= 0) {
//             continue;
//         } else if(ray.origin.x >= bmin.x && ray.origin.x <= bmax.x &&
//                   ray.origin.z >= bmin.z && ray.origin.z <= bmax.z) {
//             ret.object = i;
//             ret.normal = -ray.direction;
//             ret.distance = 0;
//             return ret;
//         }

//         float tmin = -1e10, tmax = 1e10;

//         vec3 normal;
//         if(ray.direction.x != 0) {
//             float tx1 = (bmin.x - ray.origin.x) / ray.direction.x;
//             float tx2 = (bmax.x - ray.origin.x) / ray.direction.x;
//             tmin = min(tx1, tx2);
//             tmax = max(tx1, tx2);
//             normal = vec3(-sign(ray.direction.x), 0, 0);
//         }
//         if(ray.direction.y != 0) {
//             float ty1 = (bmin.y - ray.origin.y) / ray.direction.y;
//             float ty2 = (bmax.y - ray.origin.y) / ray.direction.y;
//             tmax = min(tmax, max(ty1, ty2));
//             if(min(ty1, ty2) > tmin) {
//                 tmin = min(ty1, ty2);
//                 normal = vec3(0, -sign(ray.direction.y), 0);
//             }
//         }
//         if(ray.direction.z != 0) {
//             float tz1 = (bmin.z - ray.origin.z) / ray.direction.z;
//             float tz2 = (bmax.z - ray.origin.z) / ray.direction.z;
//             tmax = min(tmax, max(tz1, tz2));
//             if(min(tz1, tz2) > tmin) {
//                 tmin = min(tz1, tz2);
//                 normal = vec3(0, 0, -sign(ray.direction.z));
//             }
//         }

//         if(tmin > 0 && tmax > tmin &&
//            (tmin < ret.distance || ret.object == -1)) {
//             ret.distance = tmin;
//             ret.normal = normal;
//             ret.object = i;
//         }
//     }
//     return ret;
// }

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

    // heightmaps[0].position = vec3(-4, -4, 5);
    // heightmaps[0].size = vec3(8, 0.5, 8);
    // heightmaps[0].color = vec3(0, 0, 1);
    // heightmaps[0].shader = DIFFUSE_SHADER;

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
