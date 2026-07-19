FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

# Create uppercase symlinks for case-sensitive Linux filesystem
# (Windows squashes Badge.tsx/badge.tsx into one file; Linux needs both)
RUN cd src/app/components/ui && \
  for pair in "Badge:badge" "Card:card" "Button:button" "Input:input" \
              "Progress:progress" "Tabs:tabs" "Switch:switch" "Textarea:textarea"; do \
    upper=$(echo $pair | cut -d: -f1); \
    lower=$(echo $pair | cut -d: -f2); \
    ln -sf ${lower}.tsx ${upper}.tsx 2>/dev/null || true; \
  done

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
