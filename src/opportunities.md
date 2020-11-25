# permission management

Current implementation assumes permissions are always 'granted'

# unplugging active devices

# default device

Mac (Windows?) has the concept of a default device.
To my understanding this is a list ordered by the preference of the user.
If you unplug the currently selected preferred device, it goes down to the next in the list.

- unplug the current default device

# support for different browser flavours

Current implementation follows google chrome when it comes to exceptions and implementation details.
There are some old and new changes to device handling to make the chrome implementation more spec compliant.

- https://bugs.chromium.org/p/chromium/issues/detail?id=1019176
- https://bugs.chromium.org/p/chromium/issues/detail?id=1101860
