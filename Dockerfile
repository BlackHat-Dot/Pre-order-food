FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    g++ \
    gcc \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements-production.txt .
RUN python -m venv /opt/venv
RUN /opt/venv/bin/pip install --upgrade pip
RUN /opt/venv/bin/pip install -r requirements-production.txt

COPY package*.json ./
RUN npm install

COPY order-delight-main/package*.json ./order-delight-main/
RUN cd order-delight-main && npm install

COPY . .

RUN cd order-delight-main && npm run build

ENV PATH="/opt/venv/bin:$PATH"

EXPOSE 8080

CMD ["bash", "start.sh"]