# Модели полевого приложения

Сгенерировано из data.json (2026-10-04 19:49 PT). Основа: hvac-research/build/field_rules.py + catalog.py.

Набор **core** — тестовый набор для San Diego. **regress** — только для повторного прогона 12 сценариев (в приложении скрыты, включаются в «Моё»).

Почему в наборе: одна строка на модель. Все факты с источниками — в SOURCES.md.

## Наружные блоки

- **Carrier 24ACC4** [core] — Comfort AC R-410A (Puron) прошлых лет: проверка «наружный R-410A остаётся» и смешения хладагентов. _R-410A, 1 ступень, 24V_
- **Carrier 24VNA6** [core] — старый Infinity VS: проверка шины ABCD; прямой R-454B замены нет. _R-410A, инвертор/VS, только ABCD_
- **Carrier 25SCA5** [core] — Comfort ТН R-410A прошлых лет: существующий ТН + замена печи/змеевика. _R-410A, 1 ступень, 24V, клапан O_
- **Carrier 26SCA5** [core] — новый базовый AC R-454B, замена 24SCA5. _R-454B, 1 ступень, 24V_
- **Carrier 26SPA6** [regress] — нужен для прогона scenarios.txt №10. _R-454B, 1 ступень, 24V_
- **Carrier 26VNA1** [regress] — нужен для прогона scenarios.txt №2 (Infinity AC R-454B). _R-454B, инвертор/VS, только ABCD_
- **Carrier 27SCA5** [core] — новый базовый ТН R-454B, замена 25SCA5. _R-454B, 1 ступень, 24V, клапан O (не проверено)_
- **Carrier 27SPA6** [core] — Performance ТН R-454B, 1 ступень, без Coastal; в сценариях 5, 6, 12. _R-454B, 1 ступень, 24V, клапан O (не проверено)_
- **Carrier 27TPA8** [regress] — нужен для прогона scenarios.txt №11 (2-ступенчатый ТН). _R-454B, 2 ступени, 24V, клапан O (не проверено)_
- **Carrier 27VNA0** [core] — новый Infinity VS ТН R-454B: только ABCD. _R-454B, инвертор/VS, только ABCD_
- **Carrier 27VNA3** [regress] — нужен для прогона scenarios.txt №3. _R-454B, инвертор/VS, только ABCD_
- **Carrier/Bryant 37MURAQ** [core] — crossover-ТН R-454B: dual fuel с печью по сценарию 3 (кейс La Jolla). _R-454B, инвертор/VS, crossover 37MURA, клапан B_
- **Carrier/Bryant 38MURAQ** [core] — предшественник 37MURA на R-410A: существующий блок. _R-410A, инвертор/VS, crossover 38MURA, клапан B_
- **Bryant 127TAN** [core] — Bryant Preferred 2-ступенчатый AC R-410A: проверка Y2 у термостата и R-410A. _R-410A, 2 ступени, 24V_
- **Bryant 146SAN** [core] — новый Bryant Preferred AC R-454B (замена 126S). _R-454B, 1 ступень, 24V_
- **Bryant 246SAN** [core] — новый Bryant Preferred ТН R-454B. _R-454B, 1 ступень, 24V, клапан O (не проверено)_
- **Bryant 291VAN** [regress] — нужен для прогона scenarios.txt №4 (Evolution). _R-454B, инвертор/VS, только ABCD_

## Газовые печи

- **Carrier 58SC0** [core] — Carrier 80% одноступенчатая; есть в списке 37MURA Fig. 25. _24V, 80%, Type B (по префиксу, не проверено), 37MURA Fig. 25_
- **Carrier 58SB0** [regress] — нужен для прогона scenarios.txt №10. _24V, 80%, Type B (по префиксу, не проверено), 37MURA Fig. 25_
- **Carrier 59SC5B** [core] — Carrier конденсационная Comfort без шины; НЕТ в списках 37MURA Fig. 25/26. _24V, 90%, PVC (по префиксу, не проверено)_
- **Carrier 59TP6C** [core] — 2-ступенчатая Performance без шины; есть в 37MURA Fig. 26. _24V, 90%, PVC, 37MURA Fig. 26_
- **Carrier 59TN6** [core] — Infinity 96: проверка шины по печи; в базе нет PD — communicating не подтверждён. _шина — не проверено, 90%, PVC (по префиксу, не проверено), 37MURA Fig. 26_
- **Carrier 59MN7C** [core] — модулирующая печь с разъёмом communication — эталон печи на шине. _шина ABCD, 90%, PVC_
- **Bryant 801SB** [core] — Bryant 80% Legacy, есть полные IM и PD в базе; кейс La Jolla. _24V, 80%, Type B, 37MURA Fig. 25_
- **Bryant 915SB** [core] — Bryant конденсационная Legacy без шины; есть IM в базе. _24V, 90%, PVC_
- **Bryant 926T** [core] — Bryant Preferred 2-ступенчатая, не Evolution (не на шине). _24V, 90%, PVC (по префиксу, не проверено), 37MURA Fig. 26_
- **Bryant 986T** [core] — Evolution 2-ступенчатая на шине. _шина ABCD, 90%, PVC (по префиксу, не проверено), 37MURA Fig. 26_
- **Bryant 987M** [regress] — нужен для прогона scenarios.txt №4. _шина ABCD, 90%, PVC (по префиксу, не проверено)_
- **Bryant 880TA** [core] — Evolution 80%: проверка шины по печи; документа на модель в базе нет. _шина — не проверено, 80%, Type B (по префиксу, не проверено), 37MURA Fig. 26_

## Змеевики на печь

- **Carrier/Bryant CVAMA** [core] — V-coil R-454B: датчик с завода, плата RDS В КОРОБКЕ змеевика. _R-454B, RDS: датчик с завода; плата + корпус + жгут 8 ft в коробке змеевика_
- **Carrier/Bryant CAAMP** [core] — A-coil R-454B, тот же тип RDS (плата в коробке); IM CAAMP в базе нет. _R-454B, RDS: датчик с завода; плата + корпус + жгут 8 ft в коробке змеевика_
- **Carrier/Bryant CVPMA** [core] — R-410A V-coil прошлых лет: ловим смешение хладагентов. _R-410A, RDS: нет (R-410A)_
- **Carrier/Bryant 45MULAQ** [core] — furnace coil только для 37MURAQ/37MUHAQ. _R-454B, RDS: не проверено (IM нет в базе), только с 37MU_
- **Lennox CK40CT** [core] — пример ПОЛЕВОГО кита: плата 27A02 продаётся отдельно, датчик — кит 26Z69 (Rev 01) или с завода (Rev 71). _R-454B, RDS: полевой кит (плата и/или датчик отдельно), сторонний_
- **ADP C48A175L159** [core] — красный флаг кейса La Jolla. _R-410A (не проверено), RDS: нет (R-410A), сторонний_

## Фанкойлы

- **Carrier/Bryant FE5B** [core] — Infinity-фанкойл: плата и датчик RDS стоят с завода. _R-454B, RDS: датчик и плата с завода в блоке_
- **Carrier/Bryant FJ5** [core] — Comfort-фанкойл R-454B, плата с завода, обычная проводка. _R-454B, RDS: датчик и плата с завода в блоке_
- **Carrier/Bryant FMA5X** [core] — multi-position фанкойл R-454B, 1 ступень; есть схема с 37MURA (Fig. 27). _R-454B, RDS: датчик и плата с завода в блоке_
- **Carrier/Bryant 45MUAAQ** [core] — родной фанкойл 37MURA (сценарий 1, связь S1/S2). _R-454B, RDS: датчик во внутреннем блоке (своя логика 37MURA), только с 37MU_

## Термостаты

- **Carrier Infinity System Control SYSTXCCITC01** — ABCD; ТН: yes, Y2: yes, dual fuel: yes
- **Bryant Evolution Connex** — ABCD; ТН: unknown, Y2: unknown, dual fuel: unknown — **возможности не сверены с документом**
- **ecobee Smart Thermostat Premium** — 24V; ТН: yes, Y2: yes, dual fuel: partial
- **ecobee3 lite** — 24V; ТН: yes, Y2: yes, dual fuel: partial
- **PRO1 T701 (в концепции «ecobee 701»)** — 24V; ТН: no_aux, Y2: no, dual fuel: no
- **Honeywell T6 Pro** — 24V; ТН: unknown, Y2: unknown, dual fuel: unknown — **возможности не сверены с документом**
- **Google Nest** — 24V; ТН: unknown, Y2: unknown, dual fuel: unknown — **возможности не сверены с документом**
- **Carrier Cor** — 24V; ТН: unknown, Y2: unknown, dual fuel: unknown — **возможности не сверены с документом**
- **Bryant Housewise** — 24V; ТН: unknown, Y2: unknown, dual fuel: unknown — **возможности не сверены с документом**
- **Payne (термостат)** — 24V; ТН: unknown, Y2: unknown, dual fuel: unknown — **возможности не сверены с документом**

## RDS (A2L) по типам — что в коробке и как подключать

| Тип | Модели | Что в коробке | Подключение | Источник |
|---|---|---|---|---|
| Плата с завода в фанкойле | FE5B, FJ5, FMA5X | датчик + плата стоят и подключены | как обычно; Y идёт через плату к наружному. FE5B: поплавок в полевую R, не от трансформатора | CAR_TG стр.7; BRY_LK стр.13; CAR_R454_IS стр.26–27; FE5B стр.10–11 |
| Плата в коробке змеевика | CVAMA (CAAMP — по аналогии, не проверено) | датчик в змеевике; плата + корпус + жгуты 8 ft — в коробке; CCN plug — нет (ACAINTDIS10A) | 24V — Table 2: 1 красн → SEC1, 2 зел/фиол → G печи, 3 бел ← W термостата, 4 жёлт/фиол → Y наружного, 5 жёлт ← Y печи, 6 зел ← G термостата, 7 бел/фиол → W печи, 8 чёрн → C. Communicating: CCN plug A/B/C/D, провода 3–7 отрезать и изолировать, GRN/VIO → dissipation terminal | CVAMA стр.10–12; CVAMA_SS стр.4; CAR_TG стр.6 |
| Полевой кит (сторонний) | Lennox CK40CT/HT/DT | плата 27A02 — отдельно; датчик: Rev 01 → кит 26Z69, Rev 71 → с завода | термостат → TSTAT (чёрн.) → плата → INDOOR (син.) → печь; плата ≤ 48" от датчика; поплавок между термостатом и платой. С печами Carrier/Bryant нельзя | LX_RDS_NC стр.3, 7–8, 19–21; CAR_R454_IS стр.37 |
| Датчик во внутреннем 37MURA | 45MUAAQ | датчик в блоке | сценарий 1: 24V на фанкойл, S1/S2 к наружному | MURA_IM стр.5, 23 |
| Не проверено | 45MULAQ | IM нет в базе | — | — |

