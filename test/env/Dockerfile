FROM mhart/alpine-node

RUN apk add --update git \
    python \
    build-base \
    zeromq-dev

RUN mkdir /tmp/testenv

WORKDIR /tmp/testenv

COPY lib/ ./lib
COPY test/ ./test
COPY package.json ./

RUN npm install

CMD npm run test:run
