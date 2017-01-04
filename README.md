# Hey Office Meetings

Using https://serverless.com/

## Deploying to different environment (As what Serverless calls `stage`)
1. `$ serverless deploy --stage yourname`
2. Go to the AWS Lambda > Functions, search for your function: e.g. hey-office-meetings-yourName-functionName
3. Add the following environment variables to configure your Google calendar
```
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REDIRECT_URL
  GOOGLE_ACCESS_TOKEN
  GOOGLE_REFRESH_TOKEN
  GOOGLE_TOKEN_TYPE
  GOOGLE_EXPIRY_DATE
```

## 2 Ways To Trigger the Function
### Using Postman
1. Go to the path/endpoint specified after the deployment
2. POST to: e.g. https://123434334.execute-api.ap-southeast-1.amazonaws.com/dev/meetings
3. Add the following RAW Body to the call:
```
  {
  	"title" : "test",
  	"room" : "Ni Hao",
  	"start" : "2017-01-03 08:00+08",
  	"end" : "2017-01-03 10:00+08"
  }
```

### Using Serverless invoke function
1. $ serverless invoke --function create --data '{ "body": "{ \"title\" : \"test\",\"room\" : \"Ni Hao\", \"start\" : \"2017-01-03 08:00+08\",\"end\" : \"2017-01-03 10:00+08\" }" }'
