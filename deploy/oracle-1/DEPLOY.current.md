# Sub-Fetcher & Xboard 部署指南

本仓库是 Xboard 的自定义部署分支 `deploy`。包含了 Nginx 配置和集成后的 Docker Compose 配置。

## 目录结构

- `compose.yaml`: 已集成 Sub-Fetcher 服务的 Docker 配置。
- `nginx/zagzag.global.conf`: 当前服务器正在使用的 Nginx 配置文件备份。
- `sub-fetcher/`: (建议作为独立仓库维护，详见下文)。

## 更新流程

### 1. 同步上游 Xboard 更新
```bash
git fetch upstream
git checkout master
git merge upstream/master
git push origin master

git checkout deploy
git merge master
# 如有冲突请手动解决（通常在 compose.yaml）
git push origin deploy
```

### 2. 更新 Sub-Fetcher 镜像
如果您修改了 Sub-Fetcher 的代码：
```bash
docker build -t 1154761334/sub-fetcher:latest /root/sub-fetcher
docker push 1154761334/sub-fetcher:latest
# 然后在 Xboard 目录下重启服务
docker compose up -d sub-fetcher
```

## 维护者
- 1154761334
