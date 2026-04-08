A simple pipeline job that checks Gitlab for a Jenkinsfile to execute the 
groovy script which triggers a docker build from the docker file in ./server
then the build is tagged and pushed to nexus docker-hosted repo amd docker hub.
It is authenticated by the login credentials and PAT.
Finally a versioning is updated depending on the number of build.
The final output is then echoed.

Parameters are also triggered so you can skip specific actions when creating a
build.
