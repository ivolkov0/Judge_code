# JUDGE — REST API

Базовый префикс: `/api`. Интерактивная спецификация (OpenAPI/Swagger) — `http://localhost:8000/docs`.
Все защищённые эндпоинты требуют заголовок `Authorization: Bearer <JWT>`.

## Аутентификация и профиль — `/api/auth`
| Метод | Путь | Доступ | Назначение |
|------|------|--------|-----------|
| POST | `/api/auth/register` | публично | регистрация (всегда роль `participant`) |
| POST | `/api/auth/login` | публично | вход, возвращает `{ token, user }` |
| GET | `/api/auth/me` | по токену | текущий пользователь (вкл. расширенный профиль) |
| PATCH | `/api/auth/me` | по токену | частичное обновление профиля (город, телефон, навыки, github и т.д.) |
| POST | `/api/auth/password` | по токену | смена пароля (проверка текущего, `204`) |
| POST | `/api/auth/avatar` | по токену | загрузка аватара (whitelist MIME, ≤5 МБ, SVG запрещён) |

## Команды — `/api/teams`
| GET | `/api/teams` | организатор | список команд со статусами и баллами |
| GET | `/api/teams/my` | участник | моя команда (кейс, состав) |
| GET | `/api/teams/{id}/full` | жюри/организатор | агрегированная карточка команды |
| POST | `/api/teams` | участник | создать команду |
| POST | `/api/teams/join` | участник | вступить по коду |

## Заявки и артефакты — `/api/submissions`
| GET | `/api/submissions` | участник | моя заявка |
| GET | `/api/submissions/checks` | участник | статусы/баллы автопроверок |
| PUT | `/api/submissions/code` · `/docs` · `/presentation` · `/screencast` | участник | загрузка/обновление артефакта (ставит фоновую проверку) |
| GET | `/api/submissions/team/{id}/download/{type}` | жюри/организатор | скачивание артефакта |

## Критерии и оценки
| GET/POST/PUT/DELETE | `/api/criteria` | чтение — все, запись — организатор | критерии и веса |
| GET | `/api/evaluations` | жюри | список команд для оценки (флаг `my_evaluated`) |
| POST | `/api/evaluations/{team_id}` | жюри | выставить оценку по критериям + комментарий |
| GET | `/api/leaderboard` | по токену | итоговый рейтинг |

## Чеклисты, кейсы, аналитика
| GET/POST/PUT/DELETE | `/api/checklist` | чтение — все, запись — организатор | разделы docs/presentation |
| GET/POST/PUT/DELETE | `/api/cases` | чтение — все, запись — организатор | кейсы (треки) |
| GET | `/api/analytics/overview` | организатор/жюри | сводные метрики |
| GET | `/api/analytics/notifications` | организатор/жюри | лента событий |
| GET | `/api/analytics/export` | организатор | экспорт результатов CSV |

## Алгоритмический модуль — `/api/algo`
| GET | `/api/algo/problems` | по роли | список задач |
| POST | `/api/algo/problems` | организатор | создать задачу (условие, лимиты) |
| GET | `/api/algo/problems/{id}` | по роли | задача с sample-тестами |
| POST | `/api/algo/problems/{id}/tests` | организатор | добавить тест |
| POST | `/api/algo/problems/{id}/submit` | участник | отправить решение (sandbox) |
| GET | `/api/algo/submissions` | участник | мои попытки и вердикты |

## Служебное
| GET | `/api/health` | публично | проверка живости (используется в Docker healthcheck) |

Вердикты алго-модуля: **OK / WA / TL / ML / RE / CE**.
Типы автопроверок (`check_type`): `code`, `docs`, `presentation`, `screencast`.
