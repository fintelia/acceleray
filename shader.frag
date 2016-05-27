#version 330

#extension GL_ARB_explicit_uniform_location : enable
#extension GL_ARB_shader_image_load_store : enable

const int DIFFUSE_SHADER = 1;
const int MIRROR_SHADER = 2;
const int GLASS_SHADER = 3;

out vec4 OutputColor;

// struct Light {
// 	float radius;
//     vec3 position;
//     vec3 color;
// };
struct Sphere {
    float radius;
    vec3 position;
	vec3 emission;
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
layout(location = 2) uniform uint frameNumber;
//layout(location = 2) uniform vec4 rand;

//layout(location = 16) uniform int numLights = 1;
layout(location = 17) uniform int numSpheres = 9;

///*layout(location = 64) uniform*/ Light lights[16];
/*layout(location = 128) uniform*/ Sphere spheres[16];


// See: http://amindforeverprogramming.blogspot.com/2013/07/random-floats-in-glsl-330.html
uint random_state = 0u;
uint hash( uint x ) {
    x += ( x << 10u );
    x ^= ( x >>  6u );
    x += ( x <<  3u );
    x ^= ( x >> 11u );
    x += ( x << 15u );
    return x;
}
uint hash( uvec2 v ) {
    return hash( v.x ^ hash(v.y) );
}
uint hash( uvec3 v ) {
    return hash( v.x ^ hash(v.y) ^ hash(v.z) );
}
uint hash( uvec4 v ) {
    return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) );
}
float random() {
	const uint mantissaMask = 0x007FFFFFu;
	const uint one          = 0x3F800000u;
    uint h = hash(uvec4(frameNumber, gl_FragCoord.xy, random_state++));
    h &= mantissaMask;
	h |= one;
        
	return uintBitsToFloat( h ) - 1.0; 
}
vec3 randomDirection(){
	vec2 rand = vec2(random(), random());
	float theta = 2 * 3.14159 * rand.x;
	float u = 2*rand.y - 1;
	float s = sqrt(1.0 - u*u);
	
	return vec3(s*cos(theta), s*sin(theta), u);
}

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
        if(t - sqrt_det > 0.0001) {
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
// vec3 shade(int shader, vec3 color, vec3 point, vec3 normal,
//            out float reflect_weight, out float refract_weight) {
//     if(shader == DIFFUSE_SHADER) {
//         vec3 diffuseColor = vec3(0);
//         for(int i = 0; i < numLights; i++) {
// 			vec3 d = randomDirection();
//             d *= -sign(dot(d, lights[i].position - point));

//             vec3 target = lights[i].position + lights[i].radius * d;
//             vec3 lightOffset = target - point;
//             vec3 lightDirection = normalize(lightOffset);
//             Ray shadowRay = Ray(point + 0.01 * lightDirection, lightDirection);
//             Intersection shadow = sphereIntersect(shadowRay);

//             if(shadow.object == -1 ||
//                shadow.distance * shadow.distance >
//                    dot(lightOffset, lightOffset)) {
//                 diffuseColor += color * dot(normal, lightDirection);
//             }
//         }

// 		reflect_weight = 0;
// 		refract_weight = 0;
//         return mix(diffuseColor, color, 0.4);
//     } else if(shader == MIRROR_SHADER) {
// 		reflect_weight = 1;
// 		refract_weight = 0;
// 		return vec3(0);
// 	}
// }

void main() {
	// Left
    spheres[0] = Sphere(1e3, vec3(-1e3 - 50, 0,0), vec3(0),
                        vec3(.75, .25, .25), DIFFUSE_SHADER);

	//Rght
    spheres[1] = Sphere(1e3, vec3(1e3 + 50, 0, 0), vec3(0),
                        vec3(.25, .25, .75), DIFFUSE_SHADER);

	// Back
	spheres[2] = Sphere(1e3, vec3(0, 0, -1e3 - 75), vec3(0), vec3(.75, .75, .75),
                        DIFFUSE_SHADER);

	// Front
    spheres[3] = Sphere(1e3, vec3(0, 0, 1e3 + 50), vec3(0), vec3(0),
                       DIFFUSE_SHADER);

	// Bottom
    spheres[4] = Sphere(1e3, vec3(0, -1e3 - 50, 0), vec3(0),
                        vec3(.75, .75, .75), DIFFUSE_SHADER);

    // Top
    spheres[5] = Sphere(1e3, vec3(0, 1e3 + 50, 0), vec3(0),
                        vec3(.75, .75, .75), DIFFUSE_SHADER);

    // Diffuse
    spheres[6] = Sphere(10.5, vec3(0, -12, -25), vec3(0), vec3(1, 0, 1) * .999,
                        DIFFUSE_SHADER);

    // Mirror
    spheres[7] = Sphere(16.5, vec3(33, 16.5, -38), vec3(0), vec3(0.999),
                        MIRROR_SHADER);

	// Light
	spheres[8] = Sphere(50, vec3(0, 95, -30), vec3(10), vec3(0),
                        MIRROR_SHADER);

	// lights[0].radius = 5;
    // lights[0].position = vec3(0, 44.9, -30);
    // lights[0].color = vec3(10);

    vec2 position = vec2((gl_FragCoord.x - windowSize.x / 2 + random() - 0.5) /
                             (windowSize.y / 2),
                         (gl_FragCoord.y - windowSize.y / 2 + random() - 0.5) /
                             (windowSize.y / 2));

    // Initialize view
    vec3 eye = vec3(0.0, 0.0, 49.9);
	//    vec3 target = vec3(position.x, position.y + 1, 0);
    Ray initialRay = Ray(eye, normalize(vec3(position.xy, -1)));

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
        if(s.object == -1) continue;

        color.rgb += r.weight * spheres[s.object].emission;
        vec3 point = r.ray.origin + r.ray.direction * s.distance;

		
        if(r.depth > 4){
            // for(int i = 0; i < numSpheres; i++) {
            //     if(spheres[i].emission == vec3(0)) continue;
				
            //     vec3 d = randomDirection();
            //     d *= -sign(dot(d, spheres[i].position - point));

            //     vec3 target = spheres[i].position + spheres[i].radius * d;
            //     vec3 lightOffset = target - point;
            //     vec3 lightDirection = normalize(lightOffset);
            //     Ray shadowRay =
            //         Ray(point + 0.01 * lightDirection, lightDirection);
            //     Intersection shadow = sphereIntersect(shadowRay);

            //     if(shadow.object == -1 ||
            //        shadow.distance * shadow.distance >
            //            dot(lightOffset, lightOffset)) {
            //         color.rgb += r.weight * dot(s.normal, lightDirection);
            //     }
			// }
			continue;
        }

		
        if(spheres[s.object].shader == DIFFUSE_SHADER) {
            vec3 rr = randomDirection();
            rr *= sign(sign(dot(rr, s.normal)) + 0.5);
            pendingRays[numPendingRays++] =
                PendingRay(Ray(point, rr), r.weight * spheres[s.object].color,
                           r.depth + 1);
        } else if(spheres[s.object].shader == MIRROR_SHADER) {
            vec3 rr = reflect(r.ray.direction, s.normal);
            pendingRays[numPendingRays++] =
                PendingRay(Ray(point, rr), r.weight, r.depth + 1);
        }
        // if(refract_weight > 0 && r.depth < 4){
        // 	vec3 rr = refract(r.ray.direction, s.normal, 1.0 / 1.5);
        //     pendingRays[numPendingRays++] = PendingRay(
        //         Ray(point, rr), refract_weight * r.weight, r.depth + 1);
        // }
    }

    // Average color with past samples from the same pixel
    ivec2 coord = ivec2(gl_FragCoord.xy);
    vec4 colorSum = imageLoad(image, coord) + color;
    imageStore(image, coord, colorSum);
    OutputColor = vec4(colorSum.rgb / colorSum.a, 1);
}
