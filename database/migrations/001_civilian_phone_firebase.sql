-- Phase 1: civilian phone OTP registration with Firebase Authentication
-- Run once against the existing crms database.

ALTER TABLE users
    ADD COLUMN person_id INT NULL,
    ADD COLUMN firebase_uid VARCHAR(128) NULL,
    ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT fk_users_person
        FOREIGN KEY (person_id) REFERENCES persons(person_id),
    ADD UNIQUE KEY uq_users_person_id (person_id),
    ADD UNIQUE KEY uq_users_firebase_uid (firebase_uid);

-- Existing police/admin users remain unchanged.
-- Civilian users will use their normalized phone number as username.
