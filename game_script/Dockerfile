FROM python:3.12.3-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.in /app/

RUN apt-get update && \
    apt-get clean

RUN pip install --upgrade pip

RUN pip install pip-tools

RUN pip-compile --upgrade requirements.in

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "scripts/simulation.py"]