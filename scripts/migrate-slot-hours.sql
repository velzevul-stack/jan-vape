UPDATE pickup_locations
SET "workDayStart" = '12:00',
    "workDayEnd" = '23:00'
WHERE "workDayStart" = '10:00'
  AND "workDayEnd" = '21:00';
