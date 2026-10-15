# blog.cn

个人博客：纯前端 SPA + 云服务（Serverless 数据库/认证），Butterfly 风格主题。

## 功能

- 游客可浏览文章、归档、发表评论（昵称 + 内容，无需注册）
- 单管理员：手机号 + 密码登录，Markdown 编辑器（实时预览）、草稿/发布、评论管理
- 数据全部存云数据库，行级安全（RLS）控制权限

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物输出到 dist/
```

## 在线

https://blog-cn.app.workbuddy.host/

## 管理入口

`/#/admin` —— 首次登录自动创建管理员账号（仅站长使用）。
