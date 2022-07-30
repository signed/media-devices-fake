# How to release a new version

```
yarn login --registry https://registry.npmjs.org
yarn publish --registry https://registry.npmjs.org --access public --new-version 0.1.0 --tag beta
yarn tag add @fakes/media-devices@0.1.0 latest
```

# Modify released versions
https://docs.npmjs.com/unpublishing-packages-from-the-registry
https://docs.npmjs.com/policies/unpublish

```
npm login
npm dist-tag rm @fakes/media-devices beta
npm unpublish @fakes/media-devices@0.1.0
npm logout
```
