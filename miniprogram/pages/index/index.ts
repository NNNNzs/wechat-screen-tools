// index.ts
// 获取应用实例
const app = getApp<IAppOption>()
// const baseUrl = 'http://192.168.0.100:3002/auth'
const baseUrl = 'https://api.nnnnzs.cn/auth'

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    scene: '',
    openid: "",
    canIUseGetUserProfile: false,
  },
  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs',
    })
  },
  screen() {
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        this.setData({
          motto: JSON.stringify(res)
        })
      }
    })
  },
  onLoad(query) {
    // @ts-ignore
    // 获取openId
    this.handleLogin();
    const userInfo = wx.getStorageSync('userInfo');
    userInfo && this.setData({ userInfo, hasUserInfo: true })

    if (query.scene) {
      const scene = decodeURIComponent(query.scene);
      this.setData({ scene: scene });
      this.handleAuth();
    }
  },
  handleAuth() {
    const scene = this.data.scene;
    wx.request({
      url: baseUrl + '/info',
      data: { token: scene },
      success: (res) => {
        const { status, data } = res.data as { status: boolean, data: Record<any, any> }
        if (!status) return;
        this.handleChangeStatus(scene, 0)
        wx.showModal({
          title: '提示',
          content: `是否授权登录${data.appName}`,
          success: (response) => {
            if (response.confirm) {
              const openid = wx.getStorageSync('openid');
              this.getUserProfile()
                .then(userInfo => {
                  this.handleConfirm(scene, {
                    openid,
                    // @ts-ignore
                    ...userInfo,
                  }).then((confirmData) => {
                    const { status, msg } = confirmData as { status: boolean, msg: string };
                    wx.showToast({
                      title: msg,
                      icon: status ? 'success' : 'error'
                    })
                    setTimeout(() => {
                      // @ts-ignore
                      wx.exitMiniProgram({
                        success: () => {
                          wx.showToast({
                            title: msg,
                            icon: status ? 'success' : 'error'
                          })
                        }
                      })
                    }, 10e3);
                  })
                })
            }
          },
          fail: () => {
            wx.showToast({
              title: '您取消了授权',
              icon: "error",
            })
          }
        })
      },
    })
  },
  handleConfirm(token: string, data: Record<string, string>) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: baseUrl + '/confirm',
        method: 'POST',
        data: { token, ...data },
        success(res) {
          resolve(res.data)
        }
      })
    })
  },
  getUserProfile() {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    return new Promise((resolve, reject) => {
      const localUserInfo: Record<string, string> = wx.getStorageSync('userInfo');
      if (localUserInfo) {
        this.setData({
          userInfo: localUserInfo,
          hasUserInfo: true
        })
        resolve(localUserInfo);
        return
      }
      wx.getUserProfile({
        desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: (res) => {
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
          wx.setStorageSync('userInfo', res.userInfo);
          resolve(res.userInfo)
        },
        fail: () => {
          wx.showToast({
            title: '您取消了授权',
            icon: "error",
          })
          reject()
        }
      })
    })


  },
  getUserInfo(e: any) {
    // 不推荐使用getUserInfo获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
    console.log(e)
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  handleLogin() {
    const openid = wx.getStorageSync('openid')
    if (openid) {
      this.setData({
        openid: openid
      })
      console.log('getOpenIdFromLocal', openid)
      return
    }
    wx.login({
      success: (res) => {
        if (res.code) {
          const { code } = res;
          wx.request({
            url: baseUrl + '/code2Session',
            data: { code },
            success: (response: { data: { openid: string } }) => {
              const { openid } = response.data;
              this.setData({
                openid: openid
              })
              wx.setStorageSync('openid', openid)
              console.log('code2Session', response.data)
            }
          })
        }
      }
    })
  },
  handleChangeStatus(token: string, status: number) {
    wx.request({
      url: baseUrl + "/status?token=" + token,
      method: "PUT",
      data: { status: status },
      success: () => {
      }
    })
  }
})
