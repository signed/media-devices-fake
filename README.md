# media-devices-fake

The goal of this library is to provide a fake implementation of [`navigator.mediaDevices`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/mediaDevices) to ease unit testing device related code.
Although the api is standardized, the actual implementation varies between browsers, even violating the standard.
The current implementation focuses on reproducing the chromium implementation.

The implementation is driven by personal needs and by no means complete.
Not implemented APIs / behaviour follows a `fail fast` approach throwing errors with additional information about the missing feature.
In case you need not implemented behaviour feel free to open a pull request.

# How to use it

The [acceptance test](src/index.test.ts) should give you an impression on how to use the library and what is already implemented.
