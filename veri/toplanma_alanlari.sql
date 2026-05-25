-- Toplanma alanları (demo: Kocaeli + İzmir)
-- phpMyAdmin veya mysql CLI ile afet_portali veritabanında çalıştırın.

USE `afet_portali`;

DROP TABLE IF EXISTS `toplanma_alanlari`;
CREATE TABLE `toplanma_alanlari` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ad` varchar(200) COLLATE utf8mb4_turkish_ci NOT NULL,
  `il` varchar(50) COLLATE utf8mb4_turkish_ci NOT NULL,
  `ilce` varchar(80) COLLATE utf8mb4_turkish_ci DEFAULT NULL,
  `adres` varchar(255) COLLATE utf8mb4_turkish_ci DEFAULT NULL,
  `lat` decimal(10,7) NOT NULL,
  `lng` decimal(10,7) NOT NULL,
  `kapasite` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_il` (`il`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- Örnek kayıtlar (kendi verilerinizle değiştirebilir / çoğaltabilirsiniz)
INSERT INTO `toplanma_alanlari` (`ad`, `il`, `ilce`, `adres`, `lat`, `lng`, `kapasite`) VALUES
('İzmit Bekirpaşa Toplanma Alanı', 'Kocaeli', 'İzmit', 'Bekirpaşa Mah.', 40.7658000, 29.9405000, 2500),
('Gebze Millet Bahçesi', 'Kocaeli', 'Gebze', 'Mevlana Mah.', 40.8024000, 29.4312000, 1800),
('Gölcük Sahil Parkı', 'Kocaeli', 'Gölcük', 'Merkez', 40.7165000, 29.8163000, 1200),
('Körfez Cumhuriyet Meydanı', 'Kocaeli', 'Körfez', 'Yarımca', 40.7672000, 29.7814000, 900),
('Kordon Alsancak Toplanma Alanı', 'İzmir', 'Konak', 'Kordon', 38.4372000, 27.1425000, 3000),
('Bornova Evka Parkı', 'İzmir', 'Bornova', 'Evka-3', 38.4621000, 27.2208000, 1500),
('Karşıyaka İskele Meydanı', 'İzmir', 'Karşıyaka', 'Bahriye Üçok', 38.4605000, 27.1182000, 2000),
('Buca Şirinyer Parkı', 'İzmir', 'Buca', 'Şirinyer', 38.3948000, 27.1806000, 1100);
