#version 330

uniform vec2 position[4] =
    vec2[](vec2(-1, -1), vec2(1, -1), vec2(1, 1), vec2(-1, 1));

void main()
{
	gl_Position = vec4(0);
	if(gl_VertexID == 0) gl_Position = vec4(-1,-1,0,1);
	if(gl_VertexID == 1) gl_Position = vec4( 1,-1,0,1);
	if(gl_VertexID == 2) gl_Position = vec4( 1, 1,0,1);
	if(gl_VertexID == 3) gl_Position = vec4(-1, 1,0,1);
}
