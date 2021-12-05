# inconsistencies between browser implementations
## enumerateDevices
### List audio output device

#### Specification
Not yet check
#### Chrome
Speakers are listed.
Label is listed as soon as audioinput permissions are granted.
#### Firefox
Speakers are not listed by default. 
There is a flag in about:config where you can enable it.
https://bugzilla.mozilla.org/show_bug.cgi?id=1498512
