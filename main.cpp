
#include <random>
#include <chrono>
#include <cmath>
#include <fstream>
#include <iostream>
#include <memory>
#include <string>

#include <GL/glew.h>
#include <GLFW/glfw3.h>

using namespace std;

string readTextFile(const char* filename) {
    ifstream fin(filename);
    return string(istreambuf_iterator<char>(fin), istreambuf_iterator<char>());
}

void printShaderLog(string prefix, GLuint shader) {
    int logLength = 0;
    glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &logLength);
    if(logLength <= 1) return;

    unique_ptr<GLchar[]> log(new GLchar[logLength]);
    glGetShaderInfoLog(shader, logLength, nullptr, log.get());
    cout << prefix << log.get() << endl;
}
void loadShaders() {
    GLuint v = glCreateShader(GL_VERTEX_SHADER);
    string vs = readTextFile("shader.vert");
    const char* vv = vs.c_str();
    glShaderSource(v, 1, &vv, nullptr);
    glCompileShader(v);
    printShaderLog("vertex shader: ", v);

    GLuint f = glCreateShader(GL_FRAGMENT_SHADER);
    string fs = readTextFile("shader.frag");
    const char* ff = fs.c_str();
    glShaderSource(f, 1, &ff, nullptr);
    glCompileShader(f);
    printShaderLog("fragment shader: ", f);

    GLuint program = glCreateProgram();
    glAttachShader(program, v);
    glAttachShader(program, f);

    glLinkProgram(program);
    glUseProgram(program);
}

int main(void) {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<> dis(1, 2);
	
    bool reportFrameRate = true;
    GLFWwindow* window;

    /* Initialize the library */
    if(!glfwInit()) return -1;

    /* Create a windowed mode window and its OpenGL context */
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
	glfwWindowHint(GLFW_RESIZABLE, GL_FALSE);
    window = glfwCreateWindow(640, 480, "Acceleray", NULL, NULL);
    if(!window) {
        glfwTerminate();
        return -1;
    }

    /* Make the window's context current */
    glfwMakeContextCurrent(window);
	glfwSwapInterval(0);

    glewExperimental = GL_TRUE;
    glewInit();
	
    loadShaders();
	
    GLuint vao;
    glGenVertexArrays(1, &vao);
    glBindVertexArray(vao);

    int width, height;
    glfwGetWindowSize(window, &width, &height);
	glUniform2f(0, width, height);
	glViewport(0, 0, width, height);
	
	GLuint image;
	glGenTextures(1, &image);
	glBindTexture(GL_TEXTURE_2D, image);
	unique_ptr<float> imageData(new float[width*height*4]);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, width, height, 0, GL_RGBA,
                 GL_FLOAT, imageData.get());
	glBindTexture(GL_TEXTURE_2D, 0);
    glBindImageTexture(0, image, 0, GL_FALSE, 0, GL_READ_WRITE, GL_RGBA32F);

    glClearColor(0.0, 0.0, 0.0, 1.0);

    int frameCount = 0;
    auto frameCountStart = chrono::system_clock::now();
    while(!glfwWindowShouldClose(window)) {
        if(reportFrameRate && frameCount++ > 100) {
            chrono::duration<double> length =
                chrono::system_clock::now() - frameCountStart;
            cout << floor((float)frameCount / length.count()) << endl;

            frameCount = 1;
            frameCountStart = chrono::system_clock::now();
        }

		glUniform4f(2, dis(gen), dis(gen), dis(gen), dis(gen));
		
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        glDrawArrays(GL_TRIANGLE_FAN, 0, 4);

        glfwSwapBuffers(window);
        glMemoryBarrier(GL_SHADER_IMAGE_ACCESS_BARRIER_BIT);
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}
