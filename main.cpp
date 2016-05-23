
#include <memory>
#include <iostream>
#include <string>
#include <fstream>
#include <chrono>
#include <cmath>

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
	if(logLength == 0)
		return;
	
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
    printShaderLog("fragment shader", f);

    GLuint program = glCreateProgram();
    glAttachShader(program, v);
    glAttachShader(program, f);

    glLinkProgram(program);
    glUseProgram(program);
}

int main(void) {
	bool reportFrameRate = false;
    GLFWwindow* window;

    /* Initialize the library */
    if(!glfwInit()) return -1;

    /* Create a windowed mode window and its OpenGL context */
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
    window = glfwCreateWindow(640, 480, "Acceleray", NULL, NULL);
    if(!window) {
        glfwTerminate();
        return -1;
    }

    /* Make the window's context current */
    glfwMakeContextCurrent(window);
	//glfwSwapInterval(0);
	
    glewExperimental = GL_TRUE;
    glewInit();

	loadShaders();
	
    GLuint vao;
    glGenVertexArrays(1, &vao);
    glBindVertexArray(vao);

    glClearColor(0.0, 0.0, 0.0, 1.0);

	int frameCount = 0;
    auto frameCountStart = chrono::system_clock::now();
    while(!glfwWindowShouldClose(window)) {
		if(reportFrameRate && frameCount++ > 100){
            chrono::duration<double> length =
                chrono::system_clock::now() - frameCountStart;
            cout << floor((float)frameCount / length.count()) << endl;
			
			frameCount = 1;
			frameCountStart = chrono::system_clock::now();
		}
		
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        glDrawArrays(GL_TRIANGLE_FAN, 0, 4);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}
