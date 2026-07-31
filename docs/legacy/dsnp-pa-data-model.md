[← Карта системы](dsnp-pa-system-map.md) · [Back to README](../../README.md) · [Каталог расчётов →](dsnp-pa-calculation-catalog.md)

# Модель данных DSNP-PA (архив `dip_15`)

## Статус и границы реконструкции

Документ описывает фактически сохранённую модель Turbo Pascal программы DSNP-PA. Источник — неизменённые CP866-файлы из `/home/oitroot/dev/dsnp-pa-legacy/source-original/dip_15`. Главный агрегат `Type_PA.A` записывается целиком как один элемент `file of A`; `.PRE` и `.PRT` имеют одинаковый физический тип. Это не спецификация нового формата и не утверждение о смысле поля там, где исходник его не раскрывает.

Обозначения уверенности: **высокая** — смысл подтверждён объявлением, подписью UI или формулой; **средняя** — однозначно следует из использования, но не подписан; **низкая** — только осторожная расшифровка имени. Для всех `real` исторический тип — Turbo Pascal 6-byte Real (примерный диапазон `2.9e-39..1.7e38`, 11–12 значащих цифр); современный эквивалент — `number`/`float64` с явной валидацией. `byte` — 1 байт, `0..255`; `boolean` и `char` — по 1 байту в целевом TP; `string[n]` — length byte + до `n` байт CP866. Точные диапазоны предметных значений почти нигде не заданы.

Точные объявления: `TYPE_PA.PAS:7-310`; значения очистки/по умолчанию: `TYPE_PA.PAS:322-593`; запись/чтение: `FILERER.PAS:18,32-55,500-524`.

## Корневой агрегат, проект и прототип

`A` — снимок всего расчётного состояния, а не нормализованная БД.

| Historical name | Значение | Pascal type / размер | Единицы | Современный эквивалент | Уверенность | Точный источник |
|---|---|---|---|---|---|---|
| `Sto` | строительная стоимость | `SStoim` | денежные (шкала историческая) | `constructionCost` | высокая | `TYPE_PA.PAS:299-301` |
| `ply` | электрозагрузка | `PotrebPower` | смешанные | `energyLoad` | высокая | `TYPE_PA.PAS:302` |
| `bal` | раскладка масс/объёмов | `balans` | смешанные | `massBreakdown` | высокая | `TYPE_PA.PAS:303` |
| `Data` | исходные требования | `InData` | смешанные | `requirements` | высокая | `TYPE_PA.PAS:304` |
| `Geom` | геометрия корпуса | `Geometr` | смешанные | `hullGeometry` | высокая | `TYPE_PA.PAS:305` |
| `AKT` | архитектурно-конструктивный тип | `ArKonstrTip` | смешанные | `structuralConcept` | высокая | `TYPE_PA.PAS:306` |
| `dif` | таблица удифферентовки/оборудование | `Differ` | смешанные | `equipmentPlacementAndBalance` | высокая | `TYPE_PA.PAS:307` |
| `Izm` | удельные/измерительные коэффициенты | `Izmeritely` | безразмерные | `massEstimators` | средняя | `TYPE_PA.PAS:99-112,308` |
| `Expl` | эксплуатационная стоимость | `Explor` | смешанные | `operatingCost` | высокая | `TYPE_PA.PAS:219-245,309` |
| `Hodk` | ходкость и движитель | `Hodok` | смешанные | `resistanceAndPropulsion` | высокая | `TYPE_PA.PAS:19-97,310` |
| `kodir_f` | маркер кодировки строк | `char`, 1 byte | — | `legacyEncodingMarker` | средняя | `TYPE_PA.PAS:311`, `FILERER.PAS:84-167` |

`Fl_Pr=1` выбирает проект `.pre`, иначе прототип `.prt`; оба читаются в `A`. Расширение добавляется UI, поиск ведётся по `*.pre`/`*.prt` (`FILERER.PAS:346-365,500-524`). Семантическое различие состоит в роли шаблона/проекта, не в схеме файла. Начальные имена — `NONAME.PRE` и `NONAME.PRT` (`SANPROPA.PAS:31-32`).

## Исходные требования (`InData`)

| Поле | Значение | Тип / размер | Единицы | Modern | Уверенность | Источник |
|---|---|---|---|---|---|---|
| `TipPA` | тип подводного аппарата | `byte`, 1 | enum | `vehicleType` | высокая | `TYPE_PA.PAS:132` |
| `Dalnost` | дальность плавания | `real`, 6 | морские мили (подпись печати) | `rangeNmi` | высокая | `TYPE_PA.PAS:133`; `PRBOXS.PAS:146` |
| `Avtonomn` | автономность | `real`, 6 | часы | `enduranceHours` | высокая | `TYPE_PA.PAS:134`; `PRBOXS.PAS:147` |
| `Vs` | скорость хода | `real`, 6 | узлы | `speedKnots` | высокая | `TYPE_PA.PAS:135`; `HODK.PAS:39` |
| `Hrab` | рабочая глубина | `real`, 6 | m | `operatingDepthM` | высокая | `TYPE_PA.PAS:136`; `PRBOXS.PAS:149` |
| `Vtech` | скорость течения | `real`, 6 | m/s | `currentSpeedMps` | высокая | `TYPE_PA.PAS:137`; `PRBOXS.PAS:150` |
| `Ugol` | угол натекания | `real`, 6 | градусы | `inflowAngleDeg` | высокая | `TYPE_PA.PAS:138`; `PRBOXS.PAS:151` |
| `TipKab` | тип кабеля | `byte`, 1 | enum | `cableType` | высокая | `TYPE_PA.PAS:139` |
| `M` | масса ПА | `real`, 6 | t | `vehicleMassT` | высокая | `TYPE_PA.PAS:140`; `PRBOXS.PAS:160` |
| `mvv` | масса «ВВ» (расшифровка отсутствует) | `real`, 6 | t (по подписи) | `mvvLegacy` | низкая | `TYPE_PA.PAS:141`; `PRBOXS.PAS:152` |
| `DlKab` | длина кабеля | `real`, 6 | m | `cableLengthM` | высокая | `TYPE_PA.PAS:142`; `PRBOXS.PAS:157` |
| `rov` | плотность воды | `real`, 6 | t/m³ | `waterDensityTpm3` | высокая | `TYPE_PA.PAS:143,379`; `HODK.PAS:102` |

## Геометрия и конструкция корпуса

### `Geometr`

Все числовые поля — `real` (6 bytes), флаги — `boolean` (1 byte).

| Поле | Значение | Единицы | Modern | Уверенность | Источник |
|---|---|---|---|---|---|
| `liamda` | удлинение `L/B` | 1 | `lengthToBeamRatio` | высокая | `TYPE_PA.PAS:147`; `BOXS.PAS:37-41` |
| `BH` | отношение `B/H` | 1 | `beamToHeightRatio` | высокая | `TYPE_PA.PAS:148`; `BOXS.PAS:42-46` |
| `delta` | коэффициент общей полноты | 1 | `blockCoefficient` | высокая | `TYPE_PA.PAS:149`; `PRBOXS.PAS:49` |
| `Kzlk` | коэффициент заполнения лёгкого корпуса | 1 | `lightHullFillCoefficient` | высокая | `TYPE_PA.PAS:150`; `PRBOXS.PAS:50` |
| `L`, `B`, `H` | длина, ширина, высота | m | `lengthM/beamM/heightM` | высокая | `TYPE_PA.PAS:151,153-154`; `PRBOXS.PAS:46-48` |
| `Lcw` | относительная длина цилиндрической вставки | доля `L` | `cylindricalInsertLengthRatio` | высокая | `TYPE_PA.PAS:152`; `PRBOXS.PAS:51` |
| `Priam` | признак прямоугольного/скруглённого миделя | bool | `isRectangularSection` | средняя | `TYPE_PA.PAS:155`; `HODK.PAS:35-37` |
| `Kr` | относительный радиус скругления | 1 | `cornerRadiusRatio` | высокая | `TYPE_PA.PAS:156`; `PRBOXS.PAS:55` |
| `OmegaLK` | площадь мидель-шпангоута лёгкого корпуса | m² | `lightHullMidshipAreaM2` | высокая | `TYPE_PA.PAS:157`; `PRBOXS.PAS:56` |
| `Fl_liamda`, `Fl_BH`, `Fl_delta`, `Fl_Kzlk` | флаги режима ввода/расчёта соответствующих параметров | bool | `inputMode.*` | средняя | `TYPE_PA.PAS:158-161,412-415` |

### `ArKonstrTip`

| Поле | Значение | Тип | Единицы | Modern | Уверенность | Источник |
|---|---|---|---|---|---|---|
| `Llk_Lgab` | отношение длины лёгкого корпуса к габаритной | `real` | 1 | `lightHullToOverallLength` | высокая | `TYPE_PA.PAS:115`; `PRBOXS.PAS:72` |
| `t_LK`, `t_per`, `t_plt` | толщины обшивки ЛК, переборок, платформ | `real` | mm | `skin/bulkhead/platformThicknessMm` | высокая | `TYPE_PA.PAS:116,119,122`; `PRBOXS.PAS:73,76,79` |
| `ro_LK`, `ro_per`, `ro_plt`, `ro_sin` | плотности материалов ЛК, переборок, платформ, синтактика | `real` | t/m³ | `materialDensity*` | высокая | `TYPE_PA.PAS:117,120,123-124`; `PRBOXS.PAS:74,77,80-81` |
| `N_per`, `N_plt` | число переборок/горизонтальных платформ | `byte` | count | `bulkhead/platformCount` | высокая | `TYPE_PA.PAS:118,121`; `PRBOXS.PAS:75,78` |
| `TipAk` | тип аккумулятора | `byte` | enum | `batteryType` | высокая | `TYPE_PA.PAS:125,394` |
| `qak` | удельная энергия аккумуляторов | `real` | Wh/kg | `batterySpecificEnergyWhKg` | высокая | `TYPE_PA.PAS:126`; `PRBOXS.PAS:87` |
| `k_o` | коэффициент отдачи | `real` | 1 | `batteryDeliveryCoefficient` | высокая | `TYPE_PA.PAS:127`; `PRBOXS.PAS:88` |

## Электрозагрузка (`PotrebPower`)

`ply_a[1..15]`; запись №15 по умолчанию — «Ходовые двигатели» (`TYPE_PA.PAS:164-178,324-336`).

| Поле | Значение | Тип / размер | Единицы | Modern | Уверенность | Источник |
|---|---|---|---|---|---|---|
| `Name` | потребитель | `string[24]`, 25 | CP866 text | `name` | высокая | `TYPE_PA.PAS:165` |
| `Mosh` | мощность единицы | `real`, 6 | kW (по таблице) | `powerKw` | высокая | `TYPE_PA.PAS:166`; `TABL.PAS:67-90` |
| `Col` | количество | `byte`, 1 | count | `quantity` | высокая | `TYPE_PA.PAS:167` |
| `t_p`, `t_r`, `t_v` | времена потребления/работы по режимам (точные названия режимов не восстановлены) | `real` | h | `durationByMode` | средняя | `TYPE_PA.PAS:168-170`; `TABL.PAS:61-133` |
| `k_t` | коэффициент времени/использования | `real` | 1 | `utilizationFactor` | средняя | `TYPE_PA.PAS:171` |
| `Aner` | энергия строки | `real` | kWh | `energyKwh` | высокая | `TYPE_PA.PAS:172`; `TABL.PAS:190-217` |
| `Obsh_Aner` | суммарная энергия | `real` | kWh | `totalEnergyKwh` | высокая | `TYPE_PA.PAS:177`; `TABL.PAS:187-217` |

## Раскладка масс (`balans`)

`bal_a[1..10,1..12]` — до 120 строк, организованных как 10 групп по 12. Источник не содержит стабильных программных имён групп; их нельзя переносить как enum без дополнительного экземпляра `.PRE/.PRT` или UI-справки.

| Поле | Значение | Тип | Единицы | Modern | Уверенность | Источник |
|---|---|---|---|---|---|---|
| `Name` | статья массы | `string[26]`, 27 bytes | text | `name` | высокая | `TYPE_PA.PAS:181` |
| `m`, `V` | масса и объём статьи | `real` | t, m³ | `massT`, `volumeM3` | высокая | `TYPE_PA.PAS:182,184`; `TABL.PAS:340-430` |
| `a`, `b` | коэффициенты расчёта статьи | `real` | зависит от статьи | `coefficientA/B` | средняя | `TYPE_PA.PAS:183,185`; `TABL.PAS:340-430` |
| `Step_ob` | показатель степени объёмной зависимости | `byte` | integer exponent | `volumeExponent` | средняя | `TYPE_PA.PAS:186`; `TABL.PAS:340-430` |
| `ro` | плотность | `real` | t/m³ | `densityTpm3` | высокая | `TYPE_PA.PAS:187` |
| `V0,m0,V1,m1` | базовые/расчётные суммарные объёмы и массы | `real` | m³, t | `baseline/calculatedTotals` | средняя | `TYPE_PA.PAS:192-195`; `TABL.PAS:136-184` |
| `n10,n20,ninv,u10,u20,uinv` | коэффициенты/показатели трёх режимов расчёта; расшифровка отсутствует | `real` | не установлены | `legacyBalanceCoefficients` | низкая | `TYPE_PA.PAS:196-201`; `TABL.PAS:136-184` |
| `Kzlk1` | расчётный/копируемый коэффициент заполнения ЛК | `real` | 1 | `calculatedLightHullFill` | средняя | `TYPE_PA.PAS:202`; `TABL.PAS:136-184` |

## Оборудование, центры и инерция (`Differ`)

`dif_a[1..30]` — 30 размещаемых объектов. Все числа ниже `real`, кроме отмеченных строк/флагов (`TYPE_PA.PAS:247-297`). Формулы центров и моментов — `UDIFFER.PAS:18-109`.

| Поля | Значение | Тип / размер | Единицы | Modern | Уверенность | Источник |
|---|---|---|---|---|---|---|
| `SStat` | краткий код статьи | `string[5]`, 6 | text | `groupCode` | средняя | `TYPE_PA.PAS:248` |
| `Forma` | форма тела (ветви: шар, цилиндр по осям, параллелепипед) | `byte`, 1 | enum | `shape` | высокая | `TYPE_PA.PAS:249`; `UDIFFER.PAS:62-93` |
| `L,B,H` | габариты объекта | `real` | m | `dimensionsM` | высокая | `TYPE_PA.PAS:250-252` |
| `X,Y,Z` | опорные координаты объекта | `real` | m | `positionM` | высокая | `TYPE_PA.PAS:253-255`; `UDIFFER.PAS:42-47` |
| `Stat` | полное название статьи/объекта | `stroka=string[80]`, 81 | text | `name` | высокая | `TYPE_PA.PAS:257`; `SERV.PAS:10` |
| `Massa`, `Obem` | масса, вытесняемый объём | `real` | t, m³ | `massT`, `displacedVolumeM3` | высокая | `TYPE_PA.PAS:258-259`; `UDIFFER.PAS:40-47` |
| `Xg,Yg,Zg` | локальное смещение центра массы от опорной точки | `real` | m | `localCgOffsetM` | высокая | `TYPE_PA.PAS:260-262`; `UDIFFER.PAS:42-44` |
| `NN` | короткий номер/код | `string[4]`, 5 | text | `itemCode` | средняя | `TYPE_PA.PAS:263` |
| `XM,YM,ZM` | сохранённые первые моменты массы | `real` | t·m | `massFirstMoment` | высокая | `TYPE_PA.PAS:265-267`; `UDIFFER.PAS:42-44` |
| `XV,YV,ZV` | сохранённые первые моменты объёма | `real` | m⁴ | `volumeFirstMoment` | высокая | `TYPE_PA.PAS:268-270`; `UDIFFER.PAS:45-47` |
| `Razm` | размещён/не размещён | `boolean`, 1 | bool | `isPlaced` | высокая | `TYPE_PA.PAS:271` |
| `I_sx,I_sy,I_sz` | собственные моменты инерции объекта | `real` | t·m² | `centroidalInertia` | высокая | `TYPE_PA.PAS:273-275`; `UDIFFER.PAS:62-93` |
| `Ix_p,Iy_p,Iz_p` | переносные члены по теореме Штейнера | `real` | t·m² | `parallelAxisTerm` | высокая | `TYPE_PA.PAS:276-278`; `UDIFFER.PAS:96-108` |
| `Ix,Iy,Iz` | полные моменты объекта | `real` | t·m² | `inertiaAboutVehicleCg` | высокая | `TYPE_PA.PAS:279-281`; `UDIFFER.PAS:98-108` |
| `Sum_m,Sum_V` | общая масса/объём | `real` | t, m³ | `totalMassT/totalVolumeM3` | высокая | `TYPE_PA.PAS:286-287`; `UDIFFER.PAS:40-41` |
| `Sum_Xm..Sum_ZV` | суммы первых моментов | `real` | t·m / m⁴ | `firstMomentSums` | высокая | `TYPE_PA.PAS:288-293`; `UDIFFER.PAS:42-47` |
| `Xc,Yc,Zc` | центр величины по объёмам | `real` | m | `centerOfBuoyancyM` | высокая | `TYPE_PA.PAS:294-295`; `UDIFFER.PAS:50,52,54` |
| `Xg,Yg,Zg` | общий центр тяжести | `real` | m | `centerOfGravityM` | высокая | `TYPE_PA.PAS:294-295`; `UDIFFER.PAS:51,53,55` |
| `h,teta,psi` | `h = Zc - Zg` — знаковая разность координат центров по исторической оси Z; `Psi/Teta` — две угловые оценки, чьё соответствие крену/дифференту и осям явно не подписано | `real` | m, градусы | `legacyVerticalCenterDeltaM/legacyAttitudeAnglesDeg` | средняя | `TYPE_PA.PAS:296`; `UDIFFER.PAS:Raschet_Udiffer:56-58` |
| `I_PA_x,I_PA_y,I_PA_z` | суммарные моменты инерции ПА | `real` | t·m² | `vehicleInertia` | высокая | `TYPE_PA.PAS:297`; `UDIFFER.PAS:99,104,109` |

Координатная конвенция архива не объявлена достаточно строго для автоматической миграции в SNAME-NED. Знаки/начала осей нельзя угадывать по именам `X/Y/Z`.

## Ходкость и движитель (`Hodok`)

`Hodok` содержит и входы, и кэш производных расчётов. Все поля `real` (6 bytes), кроме `Priam:boolean`, `Zv,TipDv:byte`; массивы: `Uglubl[1..6]`, `Soobsh[1..6]` (`TYPE_PA.PAS:8-97`).

| Поля | Значение | Единицы | Modern | Уверенность | Источник |
|---|---|---|---|---|---|
| `H_glub,H_rab` | глубина погружения корпуса и рабочая глубина | m | `submergence/operatingDepthM` | высокая | `HODK.PAS:24-25` |
| `L,B,H,Delta,Vs,Lcv,Priam,r,OmegaGK,Midel` | копии геометрии/скорости и площадь миделя | m, m², knots, 1 | ссылки/derived geometry | высокая | `HODK.PAS:26-38` |
| `lr,br,hr` | размеры рубки/ограждения | m | `sailDimensionsM` | средняя | `TYPE_PA.PAS:32-34`; `HODK.PAS:90-100` |
| `Uglubl[].X,Omega,slog` | позиция, площадь углубления, относительная площадь | m, m², 1 | `recesses[]` | высокая | `HODK.PAS:57-63,389-395` |
| `Soobsh[].Omega,Otnosh` | площадь сообщающегося отверстия и отношение к площади миделя | m², 1 | `openings[]` | высокая | `HODK.PAS:71-80` |
| `Re,Re_r` | числа Рейнольдса корпуса/рубки | 1 | `reynoldsNumber` | высокая | `HODK.PAS:39,90` |
| `Tpl,Kf,Kr,Kudl,Kcv,Tfrm,Tsh,Tg` | коэффициенты сопротивления голого корпуса | 1 | `bareHullResistanceCoefficients` | высокая | `HODK.PAS:40-54` |
| `NbIo,NbSo,NbSt,Tlk` | добавки от углублений, отверстий, стабилизаторов и итог ЛК | 1 | `resistanceCoefficientBreakdown` | высокая | `HODK.PAS:68-89` |
| `Svst,Sgst,Skvr,Skgr` | площади вертикальных/горизонтальных стабилизаторов и рулей | m² | `controlSurfaceAreasM2` | средняя | `HODK.PAS:81-86` |
| `Kf_r,Ks_r,Tfrm_r,Tsh_r,To_r,NbOr,Tpa` | коэффициенты рубки и полный коэффициент ПА | 1 | `sailAndTotalResistance` | высокая | `HODK.PAS:92-101` |
| `R_gk,R_lk` | сопротивление голого/лёгкого корпуса | N | `dragN` | высокая | `HODK.PAS:102-103` |
| `Nbuks_gk,Nbuks` | буксировочная мощность | kW | `towPowerKw` | высокая | `HODK.PAS:104-105` |
| `Zv` | число винтов | `byte` count | `propellerCount` | высокая | `TYPE_PA.PAS:67`; `HODK.PAS:123` |
| `TipDv` | тип движителя (3 ветви формул) | `byte` enum | `propulsorType` | высокая | `TYPE_PA.PAS:68`; `HODK.PAS:138-142` |
| `diam,obv` | диаметр и частота/параметр вращения винта (точная единица `obv` не подписана) | m, unknown | `propellerDiameterM/rotationLegacy` | средняя/низкая | `HODK.PAS:107` |
| `Kde,W,t,Tv,sigE,sigP,sigP1,etaP,Kvk` и суффикс `_n` | промежуточные коэффициенты винта, упор одного винта, КПД и коэффициент влияния корпуса | смешанные | `propulsorDerived` | средняя | `HODK.PAS:109-137` |
| `KPDDv` | КПД двигателя (хранится/показывается, но в видимой итоговой формуле не использован) | 1 | `motorEfficiencyLegacy` | средняя | `TYPE_PA.PAS:69`; `HODK.PAS:196` |
| `Propuls` | пропульсивный коэффициент | 1 | `propulsiveEfficiency` | высокая | `HODK.PAS:138-143` |
| `N_el,N_dz` | требуемая электрическая мощность и мощность двигателя | kW | `requiredElectric/shaftPowerKw` | высокая | `HODK.PAS:143-145` |

## Стоимость

### Строительная (`SStoim`)

`Sto_a[1..9]`, каждая строка `k11,k12,k13,k14: real`; точные названия четырёх коэффициентов не закреплены в типе. `Sum1..Sum4` — четыре суммы, `k1,k2,k3,Knpa1..3,Kdp,Ksp,Kzp,Ktr,Kvz,Tay,Cmin1..3` — коэффициенты и три минимальные стоимости. Все по 6 bytes. Без UI-таблиц и формул нельзя безопасно расширять аббревиатуры. Источники: `TYPE_PA.PAS:205-217`; расчёты `STOIMOST.PAS:60-326`; defaults `TYPE_PA.PAS:458-480`.

### Эксплуатационная (`Explor`)

| Поля | Значение | Тип | Единицы | Modern | Уверенность | Источник |
|---|---|---|---|---|---|---|
| `Ex_a[1..5].Ri,Ti,Ki` | пять строк ресурсов/режимов: расход, время, коэффициент (точные подписи зависят от UI) | `real` | смешанные | `operatingInputs[]` | средняя | `TYPE_PA.PAS:219-223`; `STOIMOST.PAS:331-499` |
| `Ex_e[1..8].Naim,Price` | наименование и цена элемента | `string[35]` (36) + `real` | currency | `pricedItems[]` | высокая | `TYPE_PA.PAS:225-229`; `STOIMOST.PAS:656-674` |
| `Ko,Kp,USD,Na` | стоимостные/валютные коэффициенты и число аппаратов; полные расшифровки не доказаны | `real` | смешанные | `costFactors` | низкая/средняя | `TYPE_PA.PAS:231-234`; `STOIMOST.PAS:719-725` |
| `E1..E7,E` | семь составляющих эксплуатационных затрат и итог | `real` | currency | `costComponents/total` | высокая | `TYPE_PA.PAS:235-242`; `STOIMOST.PAS:728-743` |

## Оценочные коэффициенты (`Izmeritely`)

`q_ust,q_sist,q_NR,q_ZV,q_DRK,q_kik: real` — удельные коэффициенты массы для «устройства», «системы», наружного? корпуса/рамы (`NR`), забортного? (`ZV`), `DRK`, `kik`; полные расшифровки аббревиатур в коде отсутствуют. Соответствующие `Ust_Fl,Sis_Fl,NR_Fl,ZV_Fl,DRK_Fl,Kik_Fl: byte` — режимы/флаги, default `2`. Нельзя считать их boolean. Источники: `TYPE_PA.PAS:99-112,482-495`; подписи `PRBOXS.PAS:25-30` дают лишь сокращённые русские категории. Современный эквивалент: `massEstimatorCoefficients` плюс enum режима; уверенность средняя для роли и низкая для раскрытия аббревиатур.

## Бинарный layout `.PRE/.PRT`: обязательные риски миграции

1. Формат — сырой memory layout компиляторного `record A`, без magic, версии, длины, endian marker, checksum или схемы (`FILERER.PAS:18,32-37,500-524`). Нельзя читать его современным `struct` по предположению.
2. Исторический `real` — 6-byte Turbo Pascal Real48, не IEEE-754 `double`; x86 byte order и представление Real48 требуют отдельного декодера.
3. ShortString хранит длину первым байтом и CP866-байты; `string[80]` занимает 81 byte. Прямая UTF-8 перекодировка меняет layout.
4. Размеры `boolean`, выравнивание record и директивы компилятора должны воспроизводиться конкретной версией Turbo Pascal. В исходниках нет `packed record` и нет самодокументируемых offset-ов.
5. `FILERER.Save` временно сериализует `A`, затем читает до 20000 сырых байт и сравнивает/копирует их (`FILERER.PAS:27-55`). Это подтверждает зависимость от полного байтового образа, включая возможные padding/uninitialized bytes.
6. `HELP1.TXT:153-157` показывает исторические `.PRE` размером `17191` bytes, но это свидетельство конкретной версии, не универсальный размер текущего `Type_PA.A`.
7. Наличие `TYPE_PAO.A` и преобразователя `TRANSFOR.PAS`, который печатает `SizeOf(old A)`/`SizeOf(new A)` и покомпонентно переносит поля (`TRANSFOR.PAS:4-11,14-178`), доказывает уже происходившее изменение схемы. В текущем `Hodok` видны дополнительные поля относительно старой копии; определять версию только по расширению нельзя.
8. Буфер `array[1..20000] of byte` задаёт лишь технический верхний предел операции сравнения, не спецификацию размера (`FILERER.PAS:27-55`).
9. `kodir_f` используется для перекодировки строк (`FILERER.PAS:84-167`), но не заменяет полноценную версию схемы.

Безопасная современная стратегия: сначала определить вариант по точному размеру и проверенным offsets, декодировать в отдельный immutable DTO с исходными байтами/диагностикой, затем явно преобразовать единицы, enum и координаты в версионированный JSON. Не перезаписывать `.PRE/.PRT` существующим браузерным приложением.

## Неустановленное и запрещённые предположения

- Полные расшифровки `mvv`, `NR`, `ZV`, `DRK`, `kik`, `n10/n20/ninv`, `u10/u20/uinv`, большинства стоимостных коэффициентов и `obv` исходниками не доказаны.
- Значения enum `TipPA`, `TipKab`, `TipAk`, `Forma`, `TipDv`, `Step_ob` и `*_Fl` следует извлекать из обработчиков UI перед миграцией; тип `byte` сам по себе диапазона домена не задаёт.
- Архивная осевая система и начало координат для `Differ` не специфицированы; сопоставление с Body/SNAME-NED требует отдельного исследования.
- `Raschet_Udiffer` сначала обнуляет агрегаты (`UDIFFER.PAS:30-32`), затем вычисляет знаковую разность `h = Zc - Zg` и угловые оценки `Psi/Teta` с множителем `180/Pi` (`UDIFFER.PAS:56-58`). Следовательно, сохранённые углы выражены в градусах; направление исторической оси Z, соответствие углов осям, знаки и допустимость малоугловой линейной зависимости требуют отдельного подтверждения.
- Историческая валюта и масштаб стоимости зависят от UI/эпохи; названия `USD` или вывод деления на 1000 не достаточны для назначения современной валюты.

## See Also

- [Карта исторической системы](dsnp-pa-system-map.md) — программы, units и зависимости архива.
- [Каталог расчётов](dsnp-pa-calculation-catalog.md) — использование полей в исторических формулах.
- [Карта интеграции](dsnp-pa-integration-roadmap.md) — правила переноса данных в современные contracts.
