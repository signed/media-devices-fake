# jest-ts-webcompat-resolver

To fix the esm artifact the internal imports now use .js.
Jest does not like this out of the box.
[jest-ts-webcompat-resolver](https://github.com/kulshekhar/ts-jest/issues/1057#issuecomment-481406624) mitigates this by trying to load the .js file.
If this fails it tries to load .ts file.
This is a pre step to a full esm only build.

# explore package content
https://unpkg.com/browse/@fakes/media-devices@0.14.0/
