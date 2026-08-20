FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.model-cache

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cu128 torch torchvision \
    && pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY .env.example ./.env.example

EXPOSE 8001
CMD ["python", "-m", "app.main"]
