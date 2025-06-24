FROM postgres:16-alpine

COPY ./migration.sql /docker-entrypoint-initdb.d/db.sql
#                    ^ docx say this file will be executed on container startup