In heroku CLI

1. $ heroku create [app_name]


Make sure you add the following buildpacks:
 
```
$ heroku buildpacks:clear
$ heroku buildpacks:add --index 1 https://github.com/jontewks/puppeteer-heroku-buildpack
$ heroku buildpacks:add --index 2 heroku/nodejs
$ heroku buildpacks:add --index 3 https://github.com/heroku/heroku-buildpack-google-chrome.git

```
