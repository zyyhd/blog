import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

// publicConfig 来自云服务开通信息，仅含可安全发布到前端的公开配置；
// 服务端按 Origin 精确匹配校验，密钥永不落在前端。
export const publicConfig = {
  endpoint: 'https://blog-cn.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_L4osavBemjlkwPcvm95uvG_ydklp1IckEQ8f33APqq7LFj6QBKAL8hM',
}

// 全站唯一客户端实例：Auth / Database / Storage 共用
export const cloud = createWorkBuddyCloud(publicConfig)
