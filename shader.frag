#version 330

#extension GL_ARB_explicit_uniform_location : enable

const int DIFFUSE_SHADER = 1;

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
layout(location = 0) uniform vec2 windowSize = vec2(640, 480);

layout(location = 1) uniform int numLights = 1;
layout(location = 2) uniform int numSpheres = 2;

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

        if(t > 0 && (t < ret.distance || ret.object == -1)) {
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

vec3 castRay(Ray ray, int iterations) {
    if(iterations == 0) return vec3(0);

    Intersection s = sphereIntersect(ray);
    if(s.object == -1) return vec3(0);

    int shader = spheres[s.object].shader;
    vec3 color = spheres[s.object].color;
    vec3 point = ray.origin + ray.direction * s.distance;
    vec3 normal = s.normal;

    if(shader == DIFFUSE_SHADER) {
        vec3 diffuseColor = vec3(0);
        for(int i = 0; i < numLights; i++) {
            vec3 lightDirection = normalize(lights[i].position - point);
            Ray shadowRay = Ray(point + 0.01 * lightDirection, lightDirection);

            Intersection shadow = sphereIntersect(shadowRay);
            if(shadow.object == -1) {
                diffuseColor += color * dot(normal, lightDirection);
            }
        }
        return mix(diffuseColor, color, 0.4);
    }
}

void main() {
    spheres[0].position = vec3(0.5, 0.5, 1);
    spheres[0].color = vec3(1, 0, 0);
    spheres[0].radius = 0.4;
    spheres[0].shader = DIFFUSE_SHADER;

    spheres[1].position = vec3(-1, -1, 2.5);
    spheres[1].color = vec3(0, 1, 0);
    spheres[1].radius = 1.0;
    spheres[0].shader = DIFFUSE_SHADER;

    lights[0].position = vec3(1, 1, 0);
    lights[0].color = vec3(1);

    vec2 position =
        vec2((gl_FragCoord.x - windowSize.x / 2) / (windowSize.y / 2),
             (gl_FragCoord.y - windowSize.y / 2) / (windowSize.y / 2));

    vec3 eye = vec3(0, 0, -3);
    vec3 target = vec3(position, 0);
    Ray ray = Ray(eye, normalize(target - eye));

    OutputColor = vec4(castRay(ray, 1), 1);
}
