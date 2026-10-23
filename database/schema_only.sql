-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: crms
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `arrests`
--

DROP TABLE IF EXISTS `arrests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arrests` (
  `arrest_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `criminal_id` int NOT NULL,
  `officer_id` int NOT NULL,
  `arrest_date` datetime NOT NULL,
  `arrest_location` varchar(255) DEFAULT NULL,
  `reason` text,
  `court_production_date` date DEFAULT NULL,
  `custody_status` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`arrest_id`),
  KEY `case_id` (`case_id`),
  KEY `criminal_id` (`criminal_id`),
  KEY `officer_id` (`officer_id`),
  CONSTRAINT `arrests_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `arrests_ibfk_2` FOREIGN KEY (`criminal_id`) REFERENCES `criminals` (`criminal_id`),
  CONSTRAINT `arrests_ibfk_3` FOREIGN KEY (`officer_id`) REFERENCES `police_officers` (`officer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bail_applications`
--

DROP TABLE IF EXISTS `bail_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bail_applications` (
  `bail_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `criminal_id` int NOT NULL,
  `court_id` int NOT NULL,
  `application_date` date NOT NULL,
  `bail_type` varchar(30) DEFAULT NULL,
  `decision_date` date DEFAULT NULL,
  `decision` varchar(30) DEFAULT NULL,
  `conditions` text,
  PRIMARY KEY (`bail_id`),
  KEY `case_id` (`case_id`),
  KEY `criminal_id` (`criminal_id`),
  KEY `court_id` (`court_id`),
  CONSTRAINT `bail_applications_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `bail_applications_ibfk_2` FOREIGN KEY (`criminal_id`) REFERENCES `criminals` (`criminal_id`),
  CONSTRAINT `bail_applications_ibfk_3` FOREIGN KEY (`court_id`) REFERENCES `courts` (`court_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bns_sections`
--

DROP TABLE IF EXISTS `bns_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bns_sections` (
  `bns_section_id` int NOT NULL AUTO_INCREMENT,
  `chapter` int DEFAULT NULL,
  `chapter_name` varchar(150) DEFAULT NULL,
  `chapter_subtype` varchar(150) DEFAULT NULL,
  `section_number` varchar(20) NOT NULL,
  `section_title` varchar(255) DEFAULT NULL,
  `description` text,
  PRIMARY KEY (`bns_section_id`),
  UNIQUE KEY `section_number` (`section_number`)
) ENGINE=InnoDB AUTO_INCREMENT=359 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `case_charges`
--

DROP TABLE IF EXISTS `case_charges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `case_charges` (
  `charge_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `criminal_id` int NOT NULL,
  `bns_section_id` int NOT NULL,
  `charge_date` date DEFAULT NULL,
  `charge_status` varchar(30) DEFAULT 'Proposed',
  `remarks` text,
  PRIMARY KEY (`charge_id`),
  KEY `case_id` (`case_id`),
  KEY `criminal_id` (`criminal_id`),
  KEY `bns_section_id` (`bns_section_id`),
  CONSTRAINT `case_charges_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `case_charges_ibfk_2` FOREIGN KEY (`criminal_id`) REFERENCES `criminals` (`criminal_id`),
  CONSTRAINT `case_charges_ibfk_3` FOREIGN KEY (`bns_section_id`) REFERENCES `bns_sections` (`bns_section_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `case_criminals`
--

DROP TABLE IF EXISTS `case_criminals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `case_criminals` (
  `case_id` int NOT NULL,
  `criminal_id` int NOT NULL,
  `involvement` varchar(50) DEFAULT NULL,
  `remarks` text,
  PRIMARY KEY (`case_id`,`criminal_id`),
  KEY `criminal_id` (`criminal_id`),
  CONSTRAINT `case_criminals_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `case_criminals_ibfk_2` FOREIGN KEY (`criminal_id`) REFERENCES `criminals` (`criminal_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `case_timeline`
--

DROP TABLE IF EXISTS `case_timeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `case_timeline` (
  `timeline_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `event_title` varchar(150) NOT NULL,
  `event_description` text,
  `event_datetime` datetime NOT NULL,
  `performed_by` int DEFAULT NULL,
  `remarks` text,
  PRIMARY KEY (`timeline_id`),
  KEY `case_id` (`case_id`),
  KEY `performed_by` (`performed_by`),
  CONSTRAINT `case_timeline_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `case_timeline_ibfk_2` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cases`
--

DROP TABLE IF EXISTS `cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cases` (
  `case_id` int NOT NULL AUTO_INCREMENT,
  `fir_id` int NOT NULL,
  `case_title` varchar(150) NOT NULL,
  `investigating_officer_id` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT 'FIR Registered',
  `outcome` varchar(50) DEFAULT NULL,
  `closing_date` date DEFAULT NULL,
  `remarks` text,
  PRIMARY KEY (`case_id`),
  UNIQUE KEY `fir_id` (`fir_id`),
  KEY `investigating_officer_id` (`investigating_officer_id`),
  CONSTRAINT `cases_ibfk_1` FOREIGN KEY (`fir_id`) REFERENCES `fir` (`fir_id`),
  CONSTRAINT `cases_ibfk_2` FOREIGN KEY (`investigating_officer_id`) REFERENCES `police_officers` (`officer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chargesheets`
--

DROP TABLE IF EXISTS `chargesheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chargesheets` (
  `chargesheet_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `submitted_by` int NOT NULL,
  `submission_date` date NOT NULL,
  `report_type` varchar(30) DEFAULT NULL,
  `summary` text,
  `status` varchar(30) DEFAULT NULL,
  `document_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`chargesheet_id`),
  KEY `case_id` (`case_id`),
  KEY `submitted_by` (`submitted_by`),
  CONSTRAINT `chargesheets_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `chargesheets_ibfk_2` FOREIGN KEY (`submitted_by`) REFERENCES `police_officers` (`officer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `court_proceedings`
--

DROP TABLE IF EXISTS `court_proceedings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `court_proceedings` (
  `proceeding_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `court_id` int NOT NULL,
  `proceeding_date` date NOT NULL,
  `judge_name` varchar(100) DEFAULT NULL,
  `proceeding_type` varchar(50) DEFAULT NULL,
  `proceedings` text,
  `next_hearing_date` date DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`proceeding_id`),
  KEY `case_id` (`case_id`),
  KEY `court_id` (`court_id`),
  CONSTRAINT `court_proceedings_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `court_proceedings_ibfk_2` FOREIGN KEY (`court_id`) REFERENCES `courts` (`court_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `courts`
--

DROP TABLE IF EXISTS `courts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courts` (
  `court_id` int NOT NULL AUTO_INCREMENT,
  `court_name` varchar(150) NOT NULL,
  `court_type` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`court_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `crimes`
--

DROP TABLE IF EXISTS `crimes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crimes` (
  `crime_id` int NOT NULL AUTO_INCREMENT,
  `crime_name` varchar(100) NOT NULL,
  `description` text,
  `severity` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`crime_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `criminals`
--

DROP TABLE IF EXISTS `criminals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `criminals` (
  `criminal_id` int NOT NULL AUTO_INCREMENT,
  `person_id` int NOT NULL,
  `criminal_status` varchar(30) NOT NULL DEFAULT 'Suspect',
  `identification_details` text,
  `remarks` text,
  PRIMARY KEY (`criminal_id`),
  UNIQUE KEY `person_id` (`person_id`),
  CONSTRAINT `criminals_ibfk_1` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `evidence`
--

DROP TABLE IF EXISTS `evidence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evidence` (
  `evidence_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `collected_by` int NOT NULL,
  `evidence_type` varchar(50) NOT NULL,
  `description` text,
  `collection_date` date DEFAULT NULL,
  `location_found` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'Collected',
  PRIMARY KEY (`evidence_id`),
  KEY `case_id` (`case_id`),
  KEY `collected_by` (`collected_by`),
  CONSTRAINT `evidence_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `evidence_ibfk_2` FOREIGN KEY (`collected_by`) REFERENCES `police_officers` (`officer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fir`
--

DROP TABLE IF EXISTS `fir`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fir` (
  `fir_id` int NOT NULL AUTO_INCREMENT,
  `fir_number` varchar(30) NOT NULL,
  `station_id` int NOT NULL,
  `complainant_id` int NOT NULL,
  `crime_id` int NOT NULL,
  `incident_date` date NOT NULL,
  `incident_time` time DEFAULT NULL,
  `incident_location` varchar(255) DEFAULT NULL,
  `description` text,
  `registration_date` date NOT NULL,
  `status` varchar(30) DEFAULT 'Registered',
  PRIMARY KEY (`fir_id`),
  UNIQUE KEY `fir_number` (`fir_number`),
  KEY `station_id` (`station_id`),
  KEY `complainant_id` (`complainant_id`),
  KEY `crime_id` (`crime_id`),
  CONSTRAINT `fir_ibfk_1` FOREIGN KEY (`station_id`) REFERENCES `police_stations` (`station_id`),
  CONSTRAINT `fir_ibfk_2` FOREIGN KEY (`complainant_id`) REFERENCES `persons` (`person_id`),
  CONSTRAINT `fir_ibfk_3` FOREIGN KEY (`crime_id`) REFERENCES `crimes` (`crime_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `imprisonments`
--

DROP TABLE IF EXISTS `imprisonments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `imprisonments` (
  `imprisonment_id` int NOT NULL AUTO_INCREMENT,
  `sentence_id` int NOT NULL,
  `criminal_id` int NOT NULL,
  `prison_id` int NOT NULL,
  `admission_date` date NOT NULL,
  `expected_release_date` date DEFAULT NULL,
  `actual_release_date` date DEFAULT NULL,
  `status` varchar(30) DEFAULT 'Imprisoned',
  `remarks` text,
  PRIMARY KEY (`imprisonment_id`),
  KEY `sentence_id` (`sentence_id`),
  KEY `criminal_id` (`criminal_id`),
  KEY `prison_id` (`prison_id`),
  CONSTRAINT `imprisonments_ibfk_1` FOREIGN KEY (`sentence_id`) REFERENCES `sentences` (`sentence_id`),
  CONSTRAINT `imprisonments_ibfk_2` FOREIGN KEY (`criminal_id`) REFERENCES `criminals` (`criminal_id`),
  CONSTRAINT `imprisonments_ibfk_3` FOREIGN KEY (`prison_id`) REFERENCES `prisons` (`prison_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `investigations`
--

DROP TABLE IF EXISTS `investigations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `investigations` (
  `investigation_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `officer_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `findings` text,
  `status` varchar(30) DEFAULT 'Ongoing',
  `remarks` text,
  PRIMARY KEY (`investigation_id`),
  KEY `case_id` (`case_id`),
  KEY `officer_id` (`officer_id`),
  CONSTRAINT `investigations_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `investigations_ibfk_2` FOREIGN KEY (`officer_id`) REFERENCES `police_officers` (`officer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `judgments`
--

DROP TABLE IF EXISTS `judgments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `judgments` (
  `judgment_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `court_id` int NOT NULL,
  `judgment_date` date NOT NULL,
  `result` varchar(30) NOT NULL,
  `summary` text,
  `document_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`judgment_id`),
  UNIQUE KEY `case_id` (`case_id`),
  KEY `court_id` (`court_id`),
  CONSTRAINT `judgments_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `judgments_ibfk_2` FOREIGN KEY (`court_id`) REFERENCES `courts` (`court_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `persons`
--

DROP TABLE IF EXISTS `persons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `persons` (
  `person_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `aadhaar_number` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`person_id`),
  UNIQUE KEY `aadhaar_number` (`aadhaar_number`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `police_officers`
--

DROP TABLE IF EXISTS `police_officers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `police_officers` (
  `officer_id` int NOT NULL AUTO_INCREMENT,
  `station_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `rank` varchar(50) NOT NULL,
  `badge_number` varchar(30) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Active',
  PRIMARY KEY (`officer_id`),
  UNIQUE KEY `badge_number` (`badge_number`),
  KEY `station_id` (`station_id`),
  CONSTRAINT `police_officers_ibfk_1` FOREIGN KEY (`station_id`) REFERENCES `police_stations` (`station_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `police_stations`
--

DROP TABLE IF EXISTS `police_stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `police_stations` (
  `station_id` int NOT NULL AUTO_INCREMENT,
  `station_name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `city` varchar(50) NOT NULL,
  `state` varchar(50) NOT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`station_id`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `prisons`
--

DROP TABLE IF EXISTS `prisons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prisons` (
  `prison_id` int NOT NULL AUTO_INCREMENT,
  `prison_name` varchar(150) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`prison_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sentences`
--

DROP TABLE IF EXISTS `sentences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sentences` (
  `sentence_id` int NOT NULL AUTO_INCREMENT,
  `judgment_id` int NOT NULL,
  `case_id` int NOT NULL,
  `criminal_id` int NOT NULL,
  `sentence_type` varchar(50) NOT NULL,
  `duration_months` int DEFAULT NULL,
  `fine_amount` decimal(12,2) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `details` text,
  PRIMARY KEY (`sentence_id`),
  KEY `judgment_id` (`judgment_id`),
  KEY `case_id` (`case_id`),
  KEY `criminal_id` (`criminal_id`),
  CONSTRAINT `sentences_ibfk_1` FOREIGN KEY (`judgment_id`) REFERENCES `judgments` (`judgment_id`),
  CONSTRAINT `sentences_ibfk_2` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `sentences_ibfk_3` FOREIGN KEY (`criminal_id`) REFERENCES `criminals` (`criminal_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(30) NOT NULL,
  `officer_id` int DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `email` varchar(254) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `officer_id` (`officer_id`),
  UNIQUE KEY `uq_users_email` (`email`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`officer_id`) REFERENCES `police_officers` (`officer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `victims`
--

DROP TABLE IF EXISTS `victims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `victims` (
  `victim_id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `person_id` int NOT NULL,
  `injury_details` text,
  `statement` text,
  `status` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`victim_id`),
  KEY `case_id` (`case_id`),
  KEY `person_id` (`person_id`),
  CONSTRAINT `victims_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`case_id`),
  CONSTRAINT `victims_ibfk_2` FOREIGN KEY (`person_id`) REFERENCES `persons` (`person_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-23 11:50:22
