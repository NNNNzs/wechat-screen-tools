// 该页面只是exoress的router文件，具体请
const express = require('express');
const router = express.Router();
const uuid = require('uuid')
const axios = require('axios');

const config = {
  appId: "",
  appSecret: ""
}
class Wechat {

  accesstoken = null;

  getAccessToken() {
    return new Promise((resolve, reject) => {
      let url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`
      axios(url)
        .then(res => {
          resolve(res.data)
        })
        .catch(err => {
          reject(err)
        })
    })
  }
  code2Session(code) {
    return new Promise((resolve, reject) => {
      let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.appId}&secret=${config.appSecret}&js_code=${code}&grant_type=authorization_code`
      axios(url)
        .then(res => {
          resolve(res.data)
        })
        .catch(err => {
          reject(err)
        })
    })
  }
}

const wechat = new Wechat();
// 内存级别，数据库存储，偷懒
let map = {
  'B62C1219247E4B158975E2573C1094C9': {
    status: -1,
    appName: "NNNNzs的登陆",
    createTime: new Date().toLocaleString(),
  }
};


const createToken = () => {
  return uuid.v4().replace(/-/g, '').toUpperCase();
}
const createBaseInfo = (token) => {
  return {
    token,
    status: -1,
    appName: "NNNNzs的登陆",
    createTime: new Date().toLocaleString(),
  }
}

router.get('/getToken', (req, res) => {
  const token = createToken();
  map[token] = createBaseInfo()

  res.send({
    status: true,
    data: createToken(),
    msg: "获取成功"
  })
});

router.get('/getImg', async (req, res) => {
  const { access_token, expires_in } = await wechat.getAccessToken();
  const ua = req.headers['user-agent'];
  const token = req.query.token;
  const env = req.query.env;
  // env区分  release 发行版本   trial 体验版    develop 开发版

  // https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/qr-code/wxacode.getUnlimited.html
  axios({
    url: "https://api.weixin.qq.com/wxa/getwxacodeunlimit",
    method: "post",
    params: {
      access_token: access_token
    },
    responseType: "arraybuffer",
    data: {
      scene: token,
      env_version: env || "trial",
      check_path: false,
      page: 'pages/index/index'
    }
  })
    .then((response) => {
      const isSuccess = response.headers['content-type'].includes('image');
      if (!isSuccess) {
        console.log(response.data.toString('utf-8'))
      } else {
        map[token] = { ua, appName: "api.nnnnzs.cn", createTime: new Date().toLocaleString(), status: -1 }
        res.type('png').send(response.data)
      }
    })
})

router.get('/info', async (req, res) => {
  console.log('ua', req.headers['user-agent']);
  const { token } = req.query;
  res.send({
    status: true,
    data: map[token]
  })
});

router.post('/confirm', async (req, res) => {
  const { token, } = req.body;
  console.log('req.body', req.body)
  if (map[token]) {
    map[token].status = 1;
    Object.assign(map[token], req.body);
    res.send({
      status: true,
      msg: "授权成功"
    })
  } else {
    res.send({
      status: false,
      msg: "二维码已过期"
    })
  }
})

router.put('/status', async (req, res) => {
  const { token } = req.query;
  const { status } = req.body;
  if (!token) {
    res.send({
      status: false
    })
  }
  const info = map[token];
  info.status = status;
  res.send({
    status: true
  })
})


router.get('/status', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    res.send({
      status: false,
      msg: '缺少token'
    })
  } else if (!map[token]) {
    res.send({
      status: false,
      msg: 'token不存在'
    })
  }
  else {
    res.send({
      status: true,
      data: map[token].status
    })
  }
})

router.get('/code2Session', async (req, res) => {
  const { code } = req.query;
  console.log('code', code);
  const resopnse = await wechat.code2Session(code);
  console.log(resopnse);
  res.send(resopnse);
})
module.exports = router;
