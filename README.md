# media-devices-fake

tbd

- Current focus is on Chrome behaviour

## How to release a new version

```
yarn login --registry https://registry.npmjs.org
yarn publish --registry https://registry.npmjs.org --access public --new-version 0.1.0 --tag beta
```

# Opportunities

- expose passed constraints to PermissionPrompt
- Error handling for different browsers (spec compliance is still not 100%)
- support for composite devices
