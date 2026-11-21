-- Rooms the admin holds back as VIP: offered on the public availability page
-- only when every regular room is taken for the searched dates.
ALTER TABLE "rooms" ADD COLUMN "is_vip" BOOLEAN NOT NULL DEFAULT false;
