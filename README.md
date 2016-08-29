# earthquake-hazard-probabilistic-ws
Seismic hazard curve web service

==============
[![Build Status](https://travis-ci.org/usgs/earthquake-hazard-probabilistic-ws.svg?branch=master)](https://travis-ci.org/usgs/earthquake-hazard-probabilistic-ws)

Using the Generated Project
---------------------------

## Getting Started
- run `npm install` to install application development dependencies
    - The application will prompt you for configuration information,
      and create a file named `src/conf/config.json` in the project.
- run `npm run dev` from the install directory


## Docker

### Building an image

- From root of project, run:
    ```
    docker build -t usgs/earthquake-hazard-probabilistic-ws:latest .
    ```

### Running a container

When initially creating a container from the base image, you must provide
several configuration parameters based on your working environment.

- Required configuration
  - `MOUNT_PATH`: The base URL path on which to listen for requests. This can
                  be any path, an empty path, or just a slash "/".
  - `PORT`: The port number on which to listen for connections. This can be
            any available port on the host system.
  - `DB_HOST`: The hostname or IP address where the database is running.
  - `DB_NAME`: The name of the database where data is installed.
  - `DB_USER`: The database user to use for connections. This user must
               already exist.
  - `DB_PASS`: The password for the database user to connect with.
  - `DB_PORT`: The port number on which the database is listening.

- Start the container using the image tag.

  > In the command below, replace values in brackets `{VALUE}` with the
  > corresponding configuration value determined above.

    ```
    docker run -d
      --name earthquake-hazard-probabilistic-ws \
      -p {PORT}:8000 \
      -e MOUNT_PATH={MOUNT_PATH} \
      -e DB_HOST={DB_HOST} \
      -e DB_NAME={DB_NAME} \
      -e DB_USER={DB_USER} \
      -e DB_PASS={DB_PASS} \
      -e DB_PORT={DB_PORT} \
      usgs/earthquake-hazard-probabilistic-ws:latest
    ```

- Connect to the running container in browser.

  > In the URL below, replace values in brackets `{VALUE}` with the
  > corresponding configuration value determined above.

  ```
  http://localhost:{PORT}{MOUNT_PATH}
  ```

- Stopping and starting the container. Once you have successfully created
  and configured a container from a base image (above), you can subsequently
  start and stop the container with the following commands.
  ```
  docker stop earthquake-hazard-probabilistic-ws
  docker start earthquake-hazard-probabilistic-ws
  docker restart earthquake-hazard-probabilistic-ws
  ```
