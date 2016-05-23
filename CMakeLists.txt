cmake_minimum_required(VERSION 3.0)

PROJECT(acceleray CXX)
#SET(CMAKE_CXX_COMPILER "clang")
SET(CMAKE_CXX_FLAGS "-std=c++14 -Wall -O1 -ggdb")

ADD_EXECUTABLE(acceleray main.cpp)
TARGET_LINK_LIBRARIES(acceleray glfw GL GLEW)

add_custom_target(run ./acceleray DEPENDS acceleray)
