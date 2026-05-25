-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Anamakine: 127.0.0.1:3306
-- Üretim Zamanı: 28 Nis 2026, 17:59:44
-- Sunucu sürümü: 5.7.36
-- PHP Sürümü: 7.4.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Veritabanı: `afet_portali`
--

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `sehir_riskleri`
--

DROP TABLE IF EXISTS `sehir_riskleri`;
CREATE TABLE IF NOT EXISTS `sehir_riskleri` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `il` varchar(50) COLLATE utf8_turkish_ci DEFAULT NULL,
  `deprem` int(11) DEFAULT NULL,
  `sel` int(11) DEFAULT NULL,
  `heyelan` int(11) DEFAULT NULL,
  `yangin` int(11) DEFAULT NULL,
  `cig` int(11) DEFAULT NULL,
  `kuraklik` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `il` (`il`)
) ENGINE=MyISAM AUTO_INCREMENT=82 DEFAULT CHARSET=utf8 COLLATE=utf8_turkish_ci;

--
-- Tablo döküm verisi `sehir_riskleri`
--

INSERT INTO `sehir_riskleri` (`id`, `il`, `deprem`, `sel`, `heyelan`, `yangin`, `cig`, `kuraklik`) VALUES
(1, 'Adana', 7, 5, 3, 8, 1, 6),
(2, 'Adıyaman', 8, 4, 3, 5, 1, 7),
(3, 'Afyonkarahisar', 6, 3, 2, 4, 1, 7),
(4, 'Ağrı', 7, 3, 3, 2, 8, 6),
(5, 'Amasya', 7, 5, 5, 3, 2, 5),
(6, 'Ankara', 4, 3, 2, 3, 1, 7),
(7, 'Antalya', 6, 4, 3, 9, 1, 6),
(8, 'Artvin', 5, 8, 9, 3, 6, 4),
(9, 'Aydın', 7, 4, 3, 8, 1, 6),
(10, 'Balıkesir', 7, 5, 3, 7, 1, 5),
(11, 'Bilecik', 6, 4, 4, 5, 1, 5),
(12, 'Bingöl', 9, 4, 4, 3, 6, 6),
(13, 'Bitlis', 8, 4, 4, 2, 8, 6),
(14, 'Bolu', 8, 5, 6, 5, 3, 5),
(15, 'Burdur', 7, 3, 2, 6, 1, 7),
(16, 'Bursa', 8, 6, 5, 6, 2, 5),
(17, 'Çanakkale', 7, 5, 3, 7, 1, 5),
(18, 'Çankırı', 5, 3, 3, 3, 2, 6),
(19, 'Çorum', 5, 4, 4, 3, 2, 5),
(20, 'Denizli', 7, 4, 3, 7, 1, 6),
(21, 'Diyarbakır', 7, 3, 2, 5, 1, 8),
(22, 'Edirne', 3, 4, 2, 4, 1, 5),
(23, 'Elazığ', 8, 4, 4, 4, 5, 7),
(24, 'Erzincan', 9, 4, 4, 3, 7, 6),
(25, 'Erzurum', 7, 4, 4, 2, 9, 6),
(26, 'Eskişehir', 5, 3, 2, 4, 1, 6),
(27, 'Gaziantep', 7, 3, 2, 6, 1, 8),
(28, 'Giresun', 6, 9, 9, 3, 5, 4),
(29, 'Gümüşhane', 6, 6, 7, 3, 6, 5),
(30, 'Hakkari', 8, 4, 5, 2, 9, 6),
(31, 'Hatay', 9, 5, 3, 6, 1, 7),
(32, 'Isparta', 6, 3, 2, 6, 1, 6),
(33, 'Mersin', 6, 4, 3, 7, 1, 6),
(34, 'İstanbul', 9, 6, 5, 4, 1, 5),
(35, 'İzmir', 8, 5, 3, 8, 1, 6),
(36, 'Kars', 6, 3, 3, 2, 9, 6),
(37, 'Kastamonu', 6, 8, 7, 5, 4, 5),
(38, 'Kayseri', 5, 3, 2, 3, 3, 7),
(39, 'Kırklareli', 3, 4, 2, 4, 1, 5),
(40, 'Kırşehir', 4, 3, 2, 3, 1, 7),
(41, 'Kocaeli', 9, 6, 5, 5, 1, 5),
(42, 'Konya', 3, 2, 1, 3, 1, 9),
(43, 'Kütahya', 6, 4, 3, 5, 1, 6),
(44, 'Malatya', 8, 4, 3, 4, 4, 7),
(45, 'Manisa', 7, 4, 2, 8, 1, 6),
(46, 'Kahramanmaraş', 9, 4, 3, 5, 3, 7),
(47, 'Mardin', 6, 3, 2, 5, 1, 9),
(48, 'Muğla', 7, 5, 3, 9, 1, 6),
(49, 'Muş', 8, 4, 4, 2, 8, 6),
(50, 'Nevşehir', 4, 2, 1, 3, 1, 7),
(51, 'Niğde', 4, 2, 1, 3, 2, 7),
(52, 'Ordu', 6, 9, 9, 3, 4, 4),
(53, 'Rize', 5, 10, 10, 2, 5, 3),
(54, 'Sakarya', 9, 7, 6, 5, 2, 5),
(55, 'Samsun', 6, 7, 6, 4, 3, 5),
(56, 'Siirt', 6, 3, 3, 4, 2, 8),
(57, 'Sinop', 5, 6, 5, 4, 2, 5),
(58, 'Sivas', 6, 3, 3, 3, 5, 6),
(59, 'Tekirdağ', 7, 5, 3, 5, 1, 5),
(60, 'Tokat', 6, 5, 5, 3, 3, 5),
(61, 'Trabzon', 5, 9, 9, 3, 5, 4),
(62, 'Tunceli', 9, 4, 4, 3, 6, 6),
(63, 'Şanlıurfa', 6, 2, 1, 6, 1, 10),
(64, 'Uşak', 5, 3, 2, 5, 1, 6),
(65, 'Van', 9, 3, 3, 2, 8, 6),
(66, 'Yozgat', 4, 2, 1, 3, 2, 7),
(67, 'Zonguldak', 6, 7, 6, 5, 2, 5),
(68, 'Aksaray', 4, 2, 1, 3, 1, 8),
(69, 'Bayburt', 6, 5, 6, 3, 5, 5),
(70, 'Karaman', 4, 2, 1, 3, 1, 9),
(71, 'Kırıkkale', 5, 3, 2, 3, 1, 7),
(72, 'Batman', 6, 3, 2, 4, 1, 8),
(73, 'Şırnak', 7, 3, 3, 3, 3, 8),
(74, 'Bartın', 5, 7, 6, 5, 2, 5),
(75, 'Ardahan', 6, 3, 3, 2, 8, 6),
(76, 'Iğdır', 5, 2, 2, 2, 7, 7),
(77, 'Yalova', 9, 6, 5, 5, 1, 5),
(78, 'Karabük', 6, 6, 6, 5, 2, 5),
(79, 'Kilis', 6, 2, 1, 6, 1, 9),
(80, 'Osmaniye', 7, 4, 3, 7, 1, 7),
(81, 'Düzce', 9, 8, 7, 5, 2, 5);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
