# How to release a new version

```
yarn login --registry https://registry.npmjs.org
yarn publish --registry https://registry.npmjs.org --access public --new-version 0.1.0 --tag beta
yarn tag add @fakes/media-devices@0.1.0 latest
```
