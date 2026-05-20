DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User" WHERE "email" = 'admin@vermeat.ru'
  ) AND NOT EXISTS (
    SELECT 1 FROM "User" WHERE "email" = 'voroninandrey2005@gmail.com'
  ) THEN
    UPDATE "User"
    SET "email" = 'voroninandrey2005@gmail.com'
    WHERE "email" = 'admin@vermeat.ru';
  END IF;
END $$;
