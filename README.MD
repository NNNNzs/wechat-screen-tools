# 微信小程序扫码授权

## 背景

想要使用微信扫码登录自己的网址，通过授权快速获取用户的昵称，头像功能
由于没有企业认证账号，故只能通过微信小程序实现,

## 体验地址
[https://api.nnnnzs.cn/screen-demo.html?env=release](https://api.nnnnzs.cn/screen-demo.html?env=release)

## 源码
[https://github.com/NNNNzs/wechat-screen-tools](https://github.com/NNNNzs/wechat-screen-tools)

## 原理

利用微信小程序的动态创建场景码接口 ([https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/qr-code/wxacode.getUnlimited.html](https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/qr-code/wxacode.getUnlimited.html)),创建短token的信息存储在服务端，而不需要大量信息存储在二维码里，实现授权

## 流程

1. 客户端在请求图片,服务生成 token，注册到认证服务
2. 前端根据 token，获取带场景值的二维码图片，并轮训该 token 状态
3. 使用微信扫码，根据 token 获取应用信息并展示，在小程序授权登录，获取 openid,nickname,avatorImg 等信息
4. 确认允许登录后，发送 confirm 请求，发送 userInfo 值
5. 网络获取到该 token 对应的用户信息

## 流程图

![流程图](https://static.nnnnzs.cn/upload/142449493212df2e8d42bc3807e7e4d8.png)

## 核心接口

| 接口           | 传参                    | 返回值             | 说明                                              |
| -------------- | ----------------------- | ------------------ | ------------------------------------------------- |
| getToken       | -                       | token              | 获取 token                                        |
| getImgByToken  | token                   | 图片的 arrayBuffer | 获取小程序码                                      |
| getInfoByToken | token                   | userInfo           | 获取用户信息                                      |
| status         | token                   | -1\| 0\| 1         | -1 表示为扫码，0 表示已扫码未授权，1 表示已经授权 |
| confirm        | nickName、openid,头像等 | -                  | 小程序的允许授权时确认的接口                      |

## 踩坑点

### scene 长度为最大 32 字符，利用 nodejs 的 uuid.v4 生成的值超过 32 位
>解决方案

```js
uuid.v4().replace(/-/g, "").toUpperCase();
```

### 生成二维码时，如果没有指定 page 字段可能会在页面里获取不到场景值(scene)

>解决方案
>指定`page: "pages/index/index"`

### getwxacodeunlimit 接口成功直接返回 buffer 错误返回的是 json，在 axios 中需要根据 response 的 contentType 来判断成功还是失败

> 解决方案

```js
router.get("/getImgByToken", async (req, res) => {
  const { access_token, expires_in } = await wechat.getAccessToken();
  const ua = req.headers["user-agent"];
  const token = req.query.token;
  const env = req.query.env;
  // env区分  release 发行版本   trial 体验版    develop 开发版
  // https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/qr-code/wxacode.getUnlimited.html
  axios({
    url: "https://api.weixin.qq.com/wxa/getwxacodeunlimit",
    method: "post",
    params: {
      access_token: access_token,
    },
    responseType: "arraybuffer",
    data: {
      scene: token,
      env_version: env || "trial",
      check_path: false,
      page: "pages/index/index",
    },
  }).then((response) => {
    const isSuccess = response.headers["content-type"].includes("image");
    if (!isSuccess) {
      console.log(response.data.toString("utf-8"));
    } else {
      res.type("png").send(response.data);
    }
  });
});
```

### 无论是`wx.getUserProfile`还是 `wx.getUserInfo` 无法静默获取 userInfo，都需要授权弹窗登录，不过可以缓存信息
>解决方案
>扫码进入之后onLoad就弹窗，并且存储场景值，允许拒绝授权之后再次

### 开发的时候场景值每次提交代码生成预览版本比较麻烦
>解决方案
>在微信小程序开发工具里面添加条件编译，通过二维码编辑![在微信小程序开发工具里面添加条件编译，通过二维码编辑](https://static.nnnnzs.cn/upload/aebd25e424b7238b1938d829e980d0e5.png)
