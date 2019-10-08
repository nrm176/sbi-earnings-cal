In heroku CLI

1. $ heroku create [app_name]
2. $ git push heroku master
3. $ heroku run npm run [script]

Make sure you add the following buildpacks:
 
```
$ heroku buildpacks:clear
$ heroku buildpacks:add --index 1 https://github.com/jontewks/puppeteer-heroku-buildpack
$ heroku buildpacks:add --index 2 heroku/nodejs
$ heroku buildpacks:add --index 3 https://github.com/heroku/heroku-buildpack-google-chrome.git

```
