/**
 * ilk-72-saat.json üretici — karakter ve ortama özel adımlar.
 * Çalıştırma: node scripts/build-ilk-72-saat-data.js
 */
const fs = require("fs");
const path = require("path");

const opt = (text, correct, feedback) => ({ text, correct, feedback });

const phases = [
  { id: "0-1", label: "0–1 Saat", subtitle: "Şok ve ilk tepki" },
  { id: "1-6", label: "1–6 Saat", subtitle: "İletişim ve güvenlik" },
  { id: "6-24", label: "6–24 Saat", subtitle: "Barınma ve sağlık" },
  { id: "24-48", label: "24–48 Saat", subtitle: "Su ve gıda yönetimi" },
  { id: "48-72", label: "48–72 Saat", subtitle: "Psikolojik dayanıklılık" },
];

const characters = [
  {
    id: "yetiskin",
    label: "Yetişkin (tek başına)",
    description: "Tek başınıza karar verirsiniz; hız ve soğukkanlılık önemlidir.",
  },
  {
    id: "aile",
    label: "Çocuklu aile",
    description: "Çocukların güvenliği ve sakinleştirilmesi her kararda önceliklidir.",
  },
  {
    id: "yasli",
    label: "65+ / hareket kısıtlı",
    description: "İlaç, yürüteç ve komşu desteği kritik; ani hareketten kaçının.",
  },
  {
    id: "ogrenci",
    label: "Öğrenci / yurt",
    description: "Yurt veya kampüs kurallarına uyun; toplu tahliye ve iletişim önemlidir.",
  },
];

const environments = [
  { id: "apartman", label: "Apartman / site" },
  { id: "mustakil", label: "Müstakil ev" },
  { id: "kirsal", label: "Kırsal / köy" },
  { id: "isyeri", label: "İş yeri / okul" },
];

const sceneByEnv = {
  apartman: "Apartmanda uyandınız; asansör kullanılmamalı, merdiven boşluğu risklidir.",
  mustakil: "Müstakil evdesiniz; gaz vanası genelde dışarıda veya mutfakta bulunur.",
  kirsal: "Kırsal bölgedesiniz; ulaşım ve şebeke gecikebilir, komşu desteği önemlidir.",
  isyeri: "İş yerinde veya okuldasınız; bina acil planı ve toplanma noktası geçerlidir.",
};

const sceneSel = {
  apartman: "Apartman dairesindesiniz; bodrum ve zemin kat su basıyor.",
  mustakil: "Müstakil evde bahçe su altında kalıyor.",
  kirsal: "Köy yolunda su yükseliyor; tarla ve dere yatağına dikkat.",
  isyeri: "İş yerinin alt katı ve otopark su altında.",
};

const sceneFire = {
  apartman: "Site yönetimi tahliye anonsu yapıyor; asansör kapalı.",
  mustakil: "Evden çıkış için bahçe kapısı ve ana yol açık olmalı.",
  kirsal: "Köy yolu duman altında; rüzgar yönü değişebilir.",
  isyeri: "Okul/iş yeri zil ve anons ile tahliye başlatıldı.",
};

const sceneLandslide = {
  apartman: "Yamaç altındaki apartman bloğunda uyarı var.",
  mustakil: "Ev yamaç altında; bahçe duvarında çatlak görülebilir.",
  kirsal: "Yamaç ve dere yatağı yakınındasınız.",
  isyeri: "Okul binası eğimli arazide; bahçe ve otopark riskli.",
};

function step(clock, prepHooks, sceneMap, variants) {
  return { clock, prepHooks, sceneByEnv: sceneMap, variants };
}

const disasters = {
  deprem: {
    label: "Deprem",
    eventIntro: "Gece saat {time}'te güçlü bir deprem oldu.",
    eventIntroByChar: {
      yetiskin: "Gece saat {time}'te yalnız evdeyken güçlü bir deprem oldu.",
      aile: "Gece saat {time}'te çocuklar uyurken güçlü bir deprem oldu.",
      yasli: "Gece saat {time}'te yataktayken güçlü bir deprem oldu; ayağa kalkmak zor.",
      ogrenci: "Gece saat {time}'te yurtta uyurken alarm ve sarsıntı başladı.",
    },
    phases: {
      "0-1": [
        step(
          "02:23",
          ["canta:fener", "plan:meeting1"],
          sceneByEnv,
          {
            yetiskin: {
              prompt: "Sarsıntı bitti. Tek başınasınız — ilk ne yaparsınız?",
              context: "Önce kendi güvenliğiniz, sonra binanın.",
              options: [
                opt("Asansörle hızla aşağı inerim", false, "Asansör elektrik kesintisinde veya hasarda mahsur bırakabilir."),
                opt("Ayakkabı giyip gaz ve elektriği kontrol ederim", true, "Gaz kaçağı yangın riskini azaltır; ayakkabı kırık cama korur."),
                opt("Hemen tüm akrabalarımı ararım", false, "İlk dakikalarda şebeke tıkanır; önce güvenlik sonra kısa SMS."),
                opt("Balkondan aşağı bakarım", false, "Balkon düşme ve cam kırılması riski taşır."),
              ],
            },
            aile: {
              prompt: "Sarsıntı bitti. 6 ve 9 yaşındaki çocuklar korkmuş — ne yaparsınız?",
              context: "Çocukları sakinleştirmek ile güvenlik kontrolü dengelenmeli.",
              options: [
                opt("Önce çocukları kucaklayıp sakinleştiririm, sonra gazı kontrol ederim", true, "Sakin yetişkin çocukların paniğini azaltır; ardından gaz ve elektrik kontrolü şart."),
                opt("Çocukları merdivende bekletip önce eşyaları toplarım", false, "Eşya toplamak değil, hızlı ve güvenli tahliye önceliklidir."),
                opt("Asansörle çocuklarla birlikte inerim", false, "Asansör aileler için de tehlikelidir."),
                opt("Çocuklara bağırmadan hemen dışarı çıkarım, kontrol etmem", false, "Gaz ve elektrik kontrolü yangın riskini azaltır; çocukları alıp kontrollü çıkın."),
              ],
            },
            yasli: {
              prompt: "Sarsıntı bitti. Yürüteç kullanıyorsunuz ve diziniz ağrıyor — ne yaparsınız?",
              context: "Acele etmek düşme riskini artırır.",
              options: [
                opt("Hemen merdivenden tek başıma inmeye çalışırım", false, "Merdivende düşme riski yüksek; mümkünse komşu desteği isteyin."),
                opt("Oturduğum yerde kalıp komşuya veya 112'ye seslenirim", true, "Yardım çağırmak ve sabit kalmak, düşmeyi önler; komşu gaz kontrolünde yardımcı olabilir."),
                opt("İlaçlarımı unutup hemen dışarı çıkarım", false, "İlaçlar 72 saatte kritik; önce güvenli çıkış planı."),
                opt("Asansöre binip inerim", false, "Asansör 65+ bireyler için de yasaktır; mahsur kalma riski vardır."),
              ],
            },
            ogrenci: {
              prompt: "Yurtta sarsıntı durdu. Koridor gürültülü — ne yaparsınız?",
              context: "Yurt görevlisinin talimatını bekleyin.",
              options: [
                opt("Yurt görevlisinin tahliye talimatını bekler, kapıyı açık bırakırım", true, "Toplu tahliyede sıra ve kapı açık kalması hayat kurtarır."),
                opt("Pencereden atlayıp dışarı çıkarım", false, "Yüksek kat atlaması ağır yaralanma riski taşır."),
                opt("Odamda kalıp Instagram canlı yayın açarım", false, "Önce güvenli toplanma alanına gidin."),
                opt("Asansörle hızlıca inerim", false, "Yurtlarda asansör depremde kullanılmaz."),
              ],
            },
          }
        ),
      ],
      "1-6": [
        step(
          "04:10",
          ["canta:powerbank", "plan:outContact"],
          sceneByEnv,
          {
            yetiskin: {
              prompt: "Binadan çıktınız, tek başınasınız. İletişim?",
              options: [
                opt("Şehir dışı irtibat kişime tek SMS: güvendeyim + konum", true, "SMS şebekeyi daha az yorar."),
                opt("Sürekli arama yaparım", false, "Şebekeyi meşgul edersiniz."),
                opt("Sosyal medyada detaylı paylaşım yaparım", false, "Batarya ve bant genişliği israfı."),
                opt("Kimseye haber vermem", false, "En az bir kişiye durum bildirin."),
              ],
            },
            aile: {
              prompt: "Aile toplanma noktasına giderken çocuklar üşüyor. Ne yaparsınız?",
              options: [
                opt("Şehir dışı irtibat kişisine 'hepimiz güvendeyiz' SMS'i atarım", true, "Kısa SMS aileyi bilgilendirir; çocukları battaniyeyle örtün."),
                opt("Çocukları bırakıp önce araba almaya giderim", false, "Çocuklar gözetimsiz bırakılmamalı."),
                opt("Her akrabayı tek tek ararım", false, "SMS daha verimli; çocukları soğuktan koruyun."),
                opt("Sadece eşime haber veririm", false, "Planınızdaki şehir dışı irtibat kişisi de bilgilendirilmeli."),
              ],
            },
            yasli: {
              prompt: "Komşu sizi toplanma alanına götürüyor. İletişim?",
              options: [
                opt("Komşunun telefonuyla irtibat kişisine kısa mesaj gönderirim", true, "Başkasının şarjı ve SMS iletişimi kritik."),
                opt("Kendi telefonum çalışmıyor diye vazgeçerim", false, "Komşu veya yardım hattı alternatif sağlar."),
                opt("Tüm gece arama yaparım", false, "Batarya idareli kullanılmalı."),
                opt("Kimseye haber vermem, rahatsız etmem", false, "Yakınlarınız endişelenir; kısa bilgi verin."),
              ],
            },
            ogrenci: {
              prompt: "Yurtta toplanma alanındasınız. İletişim?",
              options: [
                opt("Aileme tek SMS: yurttayım, güvendeyim", true, "Kısa SMS yeterli; görevli talimatlarına uyun."),
                opt("Tüm sınıf grubuna sesli arama yaparım", false, "Şebekeyi yorar."),
                opt("Hiç haber vermem", false, "Aileniz endişelenir."),
                opt("Yurttan ayrılıp eve giderim", false, "Resmi tahliye bitmeden ayrılmayın."),
              ],
            },
          }
        ),
      ],
      "6-24": [
        step(
          "09:00",
          ["canta:battaniye", "canta:ilkYardim", "plan:meeting1"],
          sceneByEnv,
          {
            yetiskin: {
              prompt: "Gece dışarıda kaldınız. Barınma?",
              options: [
                opt("AFAD toplanma alanına veya planlı buluşma noktasına giderim", true, "Koordinasyon ve güvenli alan."),
                opt("Hasarlı daireye geri girerim", false, "Artçı ve gaz riski."),
                opt("Arabada kapalı camda uyurum", false, "Havalandırma ve güvenlik riski."),
                opt("Komşuya haber vermeden uzaklaşırım", false, "Dayanışma önemli."),
              ],
            },
            aile: {
              prompt: "Çocuklar gece uyuyamadı. Barınma?",
              options: [
                opt("Toplanma alanında çocuklara sakin aktivite ve planlı buluşma noktası", true, "Çocuklara rutin ve güvenli alan stresi azaltır."),
                opt("Çocukları sıcak tutmak için hasarlı eve dönerim", false, "Yapı güvenliği onayı olmadan girmeyin."),
                opt("Çocukları ayrı ayrı tanımadığımız yerlere bırakırım", false, "Çocuklar gözetim altında kalmalı."),
                opt("Gece boyunca arabada sürüş yaparım", false, "Dinlenme şart."),
              ],
            },
            yasli: {
              prompt: "Gece soğukta beklediniz. Barınma?",
              options: [
                opt("Toplanma alanında sıcak içecek ve battaniye ister, ilaç saatime dikkat ederim", true, "Hipotermi ve ilaç düzeni 65+ için kritik."),
                opt("Tek başıma yürüyerek uzak bir akrabaya giderim", false, "Yorgunluk ve düşme riski."),
                opt("Evde kalırım, zaten çok yoruldum", false, "Hasarlı yapı riski devam eder."),
                opt("İlaçlarımı almadan çıktım, önemsemem", false, "Kronik ilaçlar 72 saatte şart."),
              ],
            },
            ogrenci: {
              prompt: "Yurtta kalıyor musunuz, dışarı mı?",
              options: [
                opt("Yurt görevlisinin yönlendirdiği güvenli alanda kalırım", true, "Resmi talimat olmadan ayrılmayın."),
                opt("Arkadaşlarla şehir merkezine eğlenceye giderim", false, "Afet sonrası ortam öngörülemez."),
                opt("Ailemin yanına habersiz giderim", false, "Yol güvenliği ve izin kontrol edilmeli."),
                opt("Yurtta kalan eşyalarım için odaya girerim", false, "Yapı güvenliği onayı gerekir."),
              ],
            },
          }
        ),
      ],
      "24-48": [
        step(
          "Ertesi gün",
          ["canta:su", "canta:gida"],
          sceneByEnv,
          {
            yetiskin: {
              prompt: "Su ve gıda sınırlı. Tek kişilik plan?",
              options: [
                opt("Kişi başı günlük su payı ve dayanıklı gıdayı ölçülü kullanırım", true, "2–3 litre/gün hedefi."),
                opt("Musluk suyunu kaynatmadan içerim", false, "Şebeke kirlenebilir."),
                opt("Tüm stoğu ilk saatte tüketirim", false, "72 saate yayın."),
                opt("Hiç yemem", false, "Enerji gerekli."),
              ],
            },
            aile: {
              prompt: "4 kişilik ailesiniz; su ve gıda az. Ne yaparsınız?",
              options: [
                opt("Çocuklara öncelikli su payı, yetişkinler ölçülü; çanta stoğunu paylaşırım", true, "Çocuklar dehidrasyona daha hızlı yatkın; adil paylaşım şart."),
                opt("Sadece yetişkinler içer, çocuklar bekler", false, "Çocuklar öncelikli olmalı."),
                opt("Çocuklara şekerli gıda vermem", false, "Uygun dayanıklı gıda verin."),
                opt("Market kavgasına girerim", false, "Güvenlik riski."),
              ],
            },
            yasli: {
              prompt: "İlaç için su gerekli. Gıda-su planı?",
              options: [
                opt("İlaç saatlerine göre su planı yapar, çanta stoğunu ölçülü kullanırım", true, "İlaç + su 65+ için hayati."),
                opt("Susuzluğa dayanırım, ilaçları az suyla alırım", false, "Dehidrasyon ilaç etkisini bozar."),
                opt("Komşudan sürekli istemekten çekinirim", false, "Dayanışma bu dönemde normaldir."),
                opt("Sadece çay içerim", false, "Kafein idrarı artırır."),
              ],
            },
            ogrenci: {
              prompt: "Yurtta yemekhane kapalı. Su-gıda?",
              options: [
                opt("Yurt dağıtım noktası + kendi çanta stoğum", true, "Resmi dağıtım ve kişisel stok birleşir."),
                opt("Hep dışarıdan fast food sipariş ederim", false, "Teslimat kesilebilir."),
                opt("Hiç su içmem", false, "Dehidrasyon riski."),
                opt("Arkadaşların stoğunu izinsiz alırım", false, "Paylaşım ve planlama yapın."),
              ],
            },
          }
        ),
      ],
      "48-72": [
        step(
          "3. gün",
          ["canta:ilac", "plan:familyName"],
          sceneByEnv,
          {
            yetiskin: {
              prompt: "3. gün yorgunluğu. Ne yaparsınız?",
              options: [
                opt("Resmi uyarıları takip eder, kısa uyku ve rutin korurum", true, "Bilgi yorgunluğundan kaçının."),
                opt("Sürekli haber izler, uyumam", false, "Stres artar."),
                opt("İlaçlarımı kontrol etmem", false, "Kronik kullanıcılar dikkat."),
                opt("Yardımı reddederim", false, "Destek faydalı."),
              ],
            },
            aile: {
              prompt: "Çocuklar korkuyor. 3. gün yaklaşımı?",
              options: [
                opt("Yaşa uygun kısa açıklama, rutin ve resmi bilgi kaynağı", true, "Çocuklara sade dil; yetişkin sakinliği önemli."),
                opt("Çocuklara tüm korkunç detayları anlatırım", false, "Travma riski artar."),
                opt("Çocukları başkalarından gizlerim", false, "Açık iletişim güven verir."),
                opt("Televizyonu sürekli açık bırakırım", false, "Medya maruziyetini sınırlayın."),
              ],
            },
            yasli: {
              prompt: "Yorgunluk ve ilaç saati. Ne yaparsınız?",
              options: [
                opt("İlaçlarımı kontrol eder, kısa dinlenme ve resmi uyarıları takip ederim", true, "İlaç düzeni ve dinlenme 65+ için kritik."),
                opt("İlaçları atlarım, çok yoruldum", false, "Atlanan doz risklidir."),
                opt("Hiç uyumam, haber izlerim", false, "Dinlenme şart."),
                opt("Yardım istemekten utanırım", false, "Yardım almak normaldir."),
              ],
            },
            ogrenci: {
              prompt: "Sınavlar ertelendi. 3. gün ne yaparsınız?",
              options: [
                opt("Resmi duyuruları takip eder, aile ve yurt ile iletişimi sürdürürüm", true, "Doğru bilgi kaynağı önemli."),
                opt("Dedikodu gruplarına güvenirim", false, "Yanlış bilgi panik yaratır."),
                opt("Yurda zorla girerim", false, "Güvenlik onayı bekleyin."),
                opt("Hiç uyumam", false, "Dinlenme gerekli."),
              ],
            },
          }
        ),
      ],
    },
  },
};

// Sel — kısaltılmış ama karaktere özel prompt/options
function selPhases() {
  const mk = (clock, prep, promptBase, byChar) =>
    step(clock, prep, sceneSel, byChar);

  return {
    "0-1": [
      mk("14:05", ["canta:duuduk", "plan:meeting2"], "Su yükseliyor", {
        yetiskin: {
          prompt: "Sel uyarısı geldi. Tek başınasınız — ilk adım?",
          options: [
            opt("Yüksek kata çıkar, elektrik ve gazı kapatırım", true, "Yüksek nokta ve enerji kesintisi öncelikli."),
            opt("Bodruma eşya kurtarmaya inerim", false, "Su hızla yükselir."),
            opt("Araçla suyun içinden geçerim", false, "30 cm su bile tehlikelidir."),
            opt("Balkondan izlerim", false, "Güvenli iç alana geçin."),
          ],
        },
        aile: {
          prompt: "Su basıyor; çocuklar korkmuş. Ne yaparsınız?",
          options: [
            opt("Çocukları kucaklayıp yüksek kata çıkar, gazı kapatırım", true, "Önce çocuklar, sonra enerji kesintisi."),
            opt("Önce eşyaları kurtarırım", false, "Can güvenliği önce gelir."),
            opt("Çocukları alıp araçla sudan geçerim", false, "Araç selde sürüklenir."),
            opt("Çocuklara bağırmadan bodruma inmemi söylerim", false, "Bodrum en tehlikeli alandır."),
          ],
        },
        yasli: {
          prompt: "Su giriyor; yürümeniz zor. Ne yaparsınız?",
          options: [
            opt("Komşudan destek isteyerek yüksek kata çıkarım", true, "Yardım almak normaldir."),
            opt("Tek başıma bodruma inerim", false, "Düşme ve boğulma riski."),
            opt("Asansörle inerim", false, "Asansör selde tehlikelidir."),
            opt("Evde kalıp beklerim", false, "Tahliye gerekebilir."),
          ],
        },
        ogrenci: {
          prompt: "Yurtta su uyarısı var. Ne yaparsınız?",
          options: [
            opt("Yurt görevlisinin talimatıyla yüksek kata veya tahliye", true, "Toplu yönetim önemli."),
            opt("Eşyalarımı kurtarmak için kalırım", false, "Can güvenliği önce."),
            opt("Tek başıma dere yatağına bakarım", false, "Tehlikeli."),
            opt("Pencereyi açıp izlerim", false, "Su basıncı riski."),
          ],
        },
      }),
    ],
    "1-6": [
      mk("17:30", ["canta:belge", "plan:meeting1"], "Tahliye", {
        yetiskin: {
          prompt: "Tahliye emri. Ne alırsınız?",
          options: [
            opt("Belge, ilaç, çanta — hafif ve planlı çıkış", true, "Hızlı ve hafif tahliye."),
            opt("Tüm eşyaları taşırım", false, "Yavaşlarsınız."),
            opt("Evde kalırım", false, "Emre uyun."),
            opt("Elektrik hattı yanından geçerim", false, "Islak + elektrik ölümcül."),
          ],
        },
        aile: {
          prompt: "Tahliye — çocuklar ve belgeler?",
          options: [
            opt("Çocukları, belgeleri ve ilaçları alıp planlı çıkış", true, "Aile belgeleri ve ilaç öncelikli."),
            opt("Sadece çocukları alır, belgeleri bırakırım", false, "Belgeler sonra sorun çıkarır."),
            opt("Çocukları bırakıp eşya toplarım", false, "Asla."),
            opt("Tahliyeye uymam", false, "Resmi emir."),
          ],
        },
        yasli: {
          prompt: "Tahliye — hareket kısıtlı. Ne yaparsınız?",
          options: [
            opt("Komşu/afet ekibi desteğiyle belge ve ilaçla tahliye", true, "Yardım isteyin."),
            opt("Yürümeden evde kalırım", false, "Su yükselmeye devam edebilir."),
            opt("İlaçsız çıkarım", false, "İlaçları alın."),
            opt("Tek başıma dere kenarından giderim", false, "Sel yolu tehlikeli."),
          ],
        },
        ogrenci: {
          prompt: "Yurt tahliyesi. Ne yaparsınız?",
          options: [
            opt("Kimlik, telefon, çanta ile görevli talimatına uyarım", true, "Hafif ve düzenli tahliye."),
            opt("Odamda kalırım", false, "Emre uyun."),
            opt("Herkese zıt yöne giderim", false, "Talimata uyun."),
            opt("Islak priz yanından koşarım", false, "Elektrik riski."),
          ],
        },
      }),
    ],
    "6-24": [
      mk("Gece", ["canta:hijyen", "canta:ilkYardim"], "Barınma", {
        yetiskin: {
          prompt: "Geçici barınmada sağlık?",
          options: [
            opt("Sel suyu teması yok; hijyen ve temiz su", true, "Enfeksiyon riski."),
            opt("Sel suyundan içerim", false, "Asla içilmez."),
            opt("Islak kıyafetle uyurum", false, "Hipotermi."),
            opt("Islanmış ilaç kullanırım", false, "Bozulmuş olabilir."),
          ],
        },
        aile: {
          prompt: "Çocuklar ıslak. Sağlık?",
          options: [
            opt("Çocukları kuru kıyafetle değiştirir, sel suyundan uzak tutarım", true, "Çocuklar enfeksiyona yatkın."),
            opt("Çocuklara sel suyuyla el yıkarım", false, "Kirli su."),
            opt("Islak battaniyeyle uyuturum", false, "Kuru ve temiz tutun."),
            opt("Aşıları ertelerim", false, "Sağlık takibi önemli."),
          ],
        },
        yasli: {
          prompt: "Soğuk ve nem. Sağlık?",
          options: [
            opt("Kuru kıyafet, sıcak içecek, ilaç saatine dikkat", true, "65+ için hipotermi riski."),
            opt("Islak ortamda ilaçsız beklerim", false, "İlaç düzeni şart."),
            opt("Sel suyundan içerim", false, "Tehlikeli."),
            opt("Yarayı pansumansız bırakırım", false, "Enfeksiyon riski."),
          ],
        },
        ogrenci: {
          prompt: "Yurt barınmasında sağlık?",
          options: [
            opt("Hijyen kuralları, resmi su kaynağı kullanırım", true, "Toplu barınmada hijyen önemli."),
            opt("Şişe su yerine musluk", false, "Musluk kirli olabilir."),
            opt("Hasta olduğumu gizlerim", false, "Bildirin."),
            opt("Islanmış telefonu şarj ederim", false, "Elektrik riski."),
          ],
        },
      }),
    ],
    "24-48": [
      mk("2. gün", ["canta:su", "canta:gida"], "Su-gıda", {
        yetiskin: { prompt: "Su-gıda yönetimi?", options: [
          opt("Resmi dağıtım + çanta stoğu", true, "Ölçülü kullanım."),
          opt("Bozuk gıda yerim", false, "Zehirlenme."),
          opt("Hiç su içmem", false, "Dehidrasyon."),
          opt("Sadece meyve suyu", false, "Dengeli beslenme."),
        ]},
        aile: { prompt: "Aile su-gıda payı?", options: [
          opt("Çocuklara öncelikli su, yetişkinler ölçülü", true, "Adil paylaşım."),
          opt("Yetişkinler önce, çocuklar bekler", false, "Çocuklar öncelikli."),
          opt("Çocuklara yetişkin porsiyonu", false, "Yaşa uygun pay."),
          opt("Hiç plan yapmam", false, "Plan şart."),
        ]},
        yasli: { prompt: "İlaç ve su?", options: [
          opt("İlaç saatine göre su, çanta stoğu", true, "İlaç + su birlikte."),
          opt("Susuz kalırım", false, "Riskli."),
          opt("Sadece çorba", false, "Yeterli su da gerekli."),
          opt("Komşuya yük olmam diye istemem", false, "Yardım alın."),
        ]},
        ogrenci: { prompt: "Yurtta yemek?", options: [
          opt("Resmi dağıtım + çanta", true, "Güvenli kaynak."),
          opt("Marketten her şeyi alırım", false, "Stok sınırlı olabilir."),
          opt("Hiç yemem", false, "Enerji gerekli."),
          opt("Arkadaşın stoğunu çalarım", false, "Paylaşın."),
        ]},
      }),
    ],
    "48-72": [
      mk("3. gün", ["plan:notes"], "Eve dönüş", {
        yetiskin: { prompt: "Eve dönüş?", options: [
          opt("Yetkili onayı olmadan girmem", true, "Güvenlik."),
          opt("Hemen bodrumu temizlerim", false, "Elektrik riski."),
          opt("Sigorta için hemen girerim", false, "Önce onay."),
          opt("Komşuya sormadan girerim", false, "Yapı kontrolü."),
        ]},
        aile: { prompt: "Çocuklarla eve dönüş?", options: [
          opt("Yetkili onayı + çocukları önce güvenli alanda tutarım", true, "Çocuklar riskli yapıya girmesin."),
          opt("Çocukları önce eve gönderirim", false, "Önce onay."),
          opt("Çocuklara korku anlatmadan hemen girerim", false, "Yapı güvenliği."),
          opt("Çocukları başkasında bırakıp tek girerim", false, "Aile birlikte plan."),
        ]},
        yasli: { prompt: "Eve dönüş 65+?", options: [
          opt("Yapı onayı + komşu/refakat ile dönüş planı", true, "Güvenli dönüş."),
          opt("Tek başıma hemen girerim", false, "Düşme ve yapı riski."),
          opt("İlaçlarım evde kaldı diye zorla girerim", false, "Önce onay."),
          opt("Merdiveni koşarak çıkarım", false, "Düşme riski."),
        ]},
        ogrenci: { prompt: "Yurda dönüş?", options: [
          opt("Yurt yönetimi onayı beklerim", true, "Resmi süreç."),
          opt("Zorla odaya girerim", false, "Güvenlik."),
          opt("Aile evine habersiz giderim", false, "Yol güvenliği."),
          opt("Eşyalar için hemen girerim", false, "Onay bekleyin."),
        ]},
      }),
    ],
  };
}

function yanginPhases() {
  const scene = sceneFire;
  const mk = (clock, prep, byChar) => step(clock, prep, scene, byChar);
  return {
    "0-1": [mk("16:40", ["canta:duuduk", "plan:meeting1"], {
      yetiskin: { prompt: "Duman kokusu. İlk adım?", options: [
        opt("Tahliye talimatını bekler, çantamı alırım", true, "Erken tahliye."),
        opt("Tepeye yangını izlemeye giderim", false, "Tehlikeli."),
        opt("Bahçede ateş yakarım", false, "Yangını büyütür."),
        opt("Pencereyi açarım", false, "Duman içeri girer."),
      ]},
      aile: { prompt: "Duman var; çocuklar evde. Ne yaparsınız?", options: [
        opt("Çocukları alıp çanta ile tahliye talimatına uyarım", true, "Çocuklar önce."),
        opt("Önce eşyaları toplarım", false, "Can önce."),
        opt("Çocukları arabada bekletip yangını izlerim", false, "Tahliye."),
        opt("Çocuklara maske vermeden dumanlı koridorda koşarım", false, "Solunum koruyun."),
      ]},
      yasli: { prompt: "Duman uyarısı; hareket yavaş. Ne yaparsınız?", options: [
        opt("Komşu desteğiyle çanta ve ilaçla tahliye", true, "Yardım alın."),
        opt("Tek başıma merdivenden inerim, düşerim", false, "Düşme riski."),
        opt("Evde kalırım", false, "Tahliye."),
        opt("Asansör kullanırım", false, "Yasak."),
      ]},
      ogrenci: { prompt: "Yurtta yangın alarmı. Ne yaparsınız?", options: [
        opt("Görevli talimatıyla tahliye, asansörsüz", true, "Toplu tahliye."),
        opt("Odamda kalırım", false, "Tahliye."),
        opt("Yangını izlemeye giderim", false, "Tehlikeli."),
        opt("Pencereyi açıp duman alırım", false, "Duman zehirler."),
      ]},
    })],
    "1-6": [mk("18:00", ["canta:powerbank", "plan:outContact"], {
      yetiskin: { prompt: "Tahliye yolundasınız.", options: [
        opt("Alternatif rota, düşük duman", true, "Planlı rota."),
        opt("Ana yolda beklerim", false, "Tıkanır."),
        opt("Eve su serpip dönerim", false, "Kendi güvenliği."),
        opt("Eşya için geri dönerim", false, "Tehlikeli."),
      ]},
      aile: { prompt: "Aile tahliyesi.", options: [
        opt("Çocukları düşük dumanda önde, alternatif rota", true, "Çocuklar solunum riski."),
        opt("Çocukları arabada unuturum", false, "Asla."),
        opt("Ana yolda kalırım", false, "Tıkanır."),
        opt("Çocuklara panik bağırmam", false, "Sakin kalın."),
      ]},
      yasli: { prompt: "Tahliye — yavaş hareket.", options: [
        opt("Refakat ile düşük dumandan alternatif rota", true, "Refakat şart."),
        opt("Tek başıma dumanlı yoldan giderim", false, "Solunum riski."),
        opt("Araca binemem diye kalırım", false, "Yardım isteyin."),
        opt("Oksijensiz koşarım", false, "Panik tehlikeli."),
      ]},
      ogrenci: { prompt: "Yurt tahliyesi yolunda.", options: [
        opt("Görevli ve sınıf ile düzenli tahliye", true, "Düzen."),
        opt("Tek başıma farklı yere giderim", false, "Talimat."),
        opt("Dumanlı kısa yoldan keserim", false, "Tehlikeli."),
        opt("Eşya için geri dönerim", false, "Yasak."),
      ]},
    })],
    "6-24": [mk("Gece", ["canta:battaniye", "canta:ilac"], {
      yetiskin: { prompt: "Barınma — duman maruziyeti?", options: [
        opt("Solunum ve ilaç kontrolü", true, "Duman etkisi."),
        opt("Dumanlı havada koşarım", false, "Tehlikeli."),
        opt("Bölgeye geri dönerim", false, "Yasak."),
        opt("Uyumam", false, "Dinlenme gerekli."),
      ]},
      aile: { prompt: "Çocuklar öksürüyor.", options: [
        opt("Çocukların solunumunu izler, ilaç ve sıcak tutma", true, "Çocuklar hassas."),
        opt("Çocukları dumanlı alanda bırakırım", false, "Risk."),
        opt("Çocuklara korku filmi izletirim", false, "Stres artar."),
        opt("İlaçları unuturum", false, "Astım vb. risk."),
      ]},
      yasli: { prompt: "Nefes darlığı hissi.", options: [
        opt("İlaç, sıcak tutma, tıbbi yardım hattı", true, "65+ ve duman riski."),
        opt("İnhaleri kullanmam", false, "Reçete ilaçları."),
        opt("Dumanlı alanda egzersiz yaparım", false, "Tehlikeli."),
        opt("Yardım istemem", false, "112/AFAD."),
      ]},
      ogrenci: { prompt: "Yurt barınması sağlık.", options: [
        opt("Öksürük, ateş varsa bildiririm", true, "Toplu yaşamda bildirin."),
        opt("Hastayım gizlerim", false, "Bulaşır."),
        opt("Sigara içerim", false, "Yangın riski."),
        opt("Uyumam", false, "Dinlenme."),
      ]},
    })],
    "24-48": [mk("2. gün", ["canta:su", "canta:gida", "canta:radyo"], {
      yetiskin: { prompt: "Bilgi ve su-gıda?", options: [
        opt("Resmi kaynak + çanta stoğu", true, "Doğru bilgi."),
        opt("Her söylentiye inanırım", false, "Panik."),
        opt("Su içmem", false, "Gerekli."),
        opt("Yangın bölgesi gıdası", false, "Hijyen."),
      ]},
      aile: { prompt: "Çocuklara bilgi?", options: [
        opt("Resmi kaynak, sade dil, ölçülü su-gıda", true, "Çocuklara uygun bilgi."),
        opt("Sosyal medya söylentileri", false, "Yanlış bilgi."),
        opt("Çocuklara korkutucu video", false, "Travma."),
        opt("Hiç su vermem", false, "Çocuklar su içmeli."),
      ]},
      yasli: { prompt: "İlaç ve bilgi?", options: [
        opt("Pilli radyo, resmi duyuru, ilaç düzeni", true, "65+ için çoklu ihtiyaç."),
        opt("Sürekli TV, uyumam", false, "Dinlenme."),
        opt("İlaçları atlarım", false, "Risk."),
        opt("Yardım reddederim", false, "Destek faydalı."),
      ]},
      ogrenci: { prompt: "Yurt ve haber?", options: [
        opt("Resmi duyuru + yurt yönetimi", true, "Doğru kaynak."),
        opt("TikTok söylentileri", false, "Yanlış."),
        opt("Hiç su içmem", false, "Dehidrasyon."),
        opt("Yurda zorla girerim", false, "Onay."),
      ]},
    })],
    "48-72": [mk("3. gün", ["plan:familyName"], {
      yetiskin: { prompt: "Psikolojik toparlanma?", options: [
        opt("Rutin, dinlenme, resmi bilgi", true, "Stres yönetimi."),
        opt("İzole kalırım", false, "Destek faydalı."),
        opt("Sürekli haber", false, "Yorgunluk."),
        opt("Yardım reddederim", false, "Destek alın."),
      ]},
      aile: { prompt: "Aile ile toparlanma?", options: [
        opt("Aile toplantısı, görev paylaşımı, çocuklara sade dil", true, "Yapı destekler."),
        opt("Çocuklara detaylı korku anlatırım", false, "Travma."),
        opt("Hiç konuşmam", false, "İletişim iyileştirir."),
        opt("Çocukları suçlarım", false, "Stres artar."),
      ]},
      yasli: { prompt: "Yalnızlık ve stres?", options: [
        opt("Komşu/aile iletişimi, rutin, ilaç", true, "Sosyal bağ önemli."),
        opt("Kimseyle konuşmam", false, "İzolasyon."),
        opt("İlaçları bırakırım", false, "Devam edin."),
        opt("Yardım istemem", false, "Normaldir."),
      ]},
      ogrenci: { prompt: "Sınav stresi + afet?", options: [
        opt("Resmi bilgi, aile/yurt iletişim, dinlenme", true, "Denge."),
        opt("Sürekli sosyal medya", false, "Stres."),
        opt("Uyumam", false, "Dinlenme."),
        opt("Psikolojik destekten utanırım", false, "Destek alın."),
      ]},
    })],
  };
}

function heyelanPhases() {
  const scene = sceneLandslide;
  const mk = (clock, prep, byChar) => step(clock, prep, scene, byChar);
  return {
    "0-1": [mk("03:15", ["canta:fener", "plan:meeting2"], {
      yetiskin: { prompt: "Gürültü ve zemin hareketi. Ne yaparsınız?", options: [
        opt("Yamaç altındaysam yana ve yukarı kaçarım", true, "Dik kaçış."),
        opt("Pencereden bakarım", false, "Cam riski."),
        opt("Bodrumda kalırım", false, "Tehlikeli."),
        opt("Dar vadiden araçla geçerim", false, "Heyelan yolu."),
      ]},
      aile: { prompt: "Heyelan uyarısı; çocuklar uyuyor.", options: [
        opt("Çocukları alıp yamaç dışı güvenli alana", true, "Çocuklar önce."),
        opt("Önce eşya toplarım", false, "Can önce."),
        opt("Çocukları arabada bırakıp bakarım", false, "Gözetim."),
        opt("Vadiden hızlı geçerim", false, "Tehlikeli."),
      ]},
      yasli: { prompt: "Heyelan sesi; hareket kısıtlı.", options: [
        opt("Komşuya seslenir, yamaçtan uzak güvenli alan", true, "Yardım ve uzaklaşma."),
        opt("Tek başıma vadiye inerim", false, "Tehlikeli."),
        opt("Bodrumda kalırım", false, "Risk."),
        opt("Koşmaya çalışırım, düşerim", false, "Düşme riski."),
      ]},
      ogrenci: { prompt: "Yurtta heyelan uyarısı.", options: [
        opt("Görevli talimatıyla tahliye alanına", true, "Toplu yönetim."),
        opt("Dışarı izlemeye giderim", false, "Tehlikeli."),
        opt("Odamda kalırım", false, "Talimat."),
        opt("Vadiden kısayol", false, "Yasak."),
      ]},
    })],
    "1-6": [mk("06:00", ["canta:powerbank", "plan:outContact"], {
      yetiskin: { prompt: "Güvenli alandasınız. İletişim?", options: [
        opt("112 + şehir dışı SMS, konum", true, "Konum kritik."),
        opt("Bölgeye fotoğraf için dönerim", false, "İkinci heyelan."),
        opt("Sessiz kalırım", false, "Bildirin."),
        opt("Gün boyu arama", false, "Batarya."),
      ]},
      aile: { prompt: "Aile güvende mi?", options: [
        opt("Aile üyeleri ve irtibat kişisine kısa SMS", true, "Koordinasyon."),
        opt("Sadece bir çocuğu ararım", false, "Hepsini bilgilendirin."),
        opt("Çocukları ayırmadan tek tek ararım", false, "SMS verimli."),
        opt("Kimseye haber vermem", false, "Endişe."),
      ]},
      yasli: { prompt: "Yardım ve iletişim?", options: [
        opt("Komşu telefonuyla 112 ve aileye SMS", true, "Alternatif iletişim."),
        opt("Telefonum yok diye vazgeçerim", false, "Komşu yardımı."),
        opt("Heyelan alanına dönerim", false, "Tehlikeli."),
        opt("Konumumu paylaşmam", false, "Kurtarma için gerekli."),
      ]},
      ogrenci: { prompt: "Yurtta iletişim?", options: [
        opt("Aileye SMS, yurt sayımına katılırım", true, "Sayım önemli."),
        opt("Sosyal medyada konum paylaşırım", false, "Güvenlik."),
        opt("Hiç haber vermem", false, "Aile endişelenir."),
        opt("Bölgeye geri giderim", false, "Tehlikeli."),
      ]},
    })],
    "6-24": [mk("Öğle", ["canta:ilkYardim", "canta:battaniye"], {
      yetiskin: { prompt: "Yaralı var. Ne yaparsınız?", options: [
        opt("Yanlış taşımadan ilk yardım, profesyonel çağırırım", true, "Omurilik riski."),
        opt("Ağır yaralıyı sürüklerim", false, "Tehlikeli."),
        opt("Islak soğukta beklerim", false, "Hipotermi."),
        opt("İlk yardım bilmeden müdahale", false, "Eğitim varsa."),
      ]},
      aile: { prompt: "Çocuk hafif yaralı.", options: [
        opt("Çocuğu sakinleştirir, ilk yardım, 112", true, "Sakin yetişkin."),
        opt("Panikle koşarım, çocuğu sallarım", false, "Sakin kalın."),
        opt("Yarayı görmezden gelirim", false, "Enfeksiyon."),
        opt("Çocuğu taşımaya zorlarım", false, "Boyun travması riski."),
      ]},
      yasli: { prompt: "Düşme sonrası ağrı.", options: [
        opt("Hareket etmem, 112, komşu desteği", true, "Omurilik şüphesi."),
        opt("Ayağa kalkıp yürürüm", false, "Kırık riski."),
        opt("İlaçlarımı unuturum", false, "Ağrı kesici reçete."),
        opt("Yaralıyı tek taşırım", false, "Profesyonel yardım."),
      ]},
      ogrenci: { prompt: "Arkadaş yaralı.", options: [
        opt("112, görevliye haber, yanlış taşımam", true, "Profesyonel yardım."),
        opt("Fotoğraf çekerim", false, "Önce yardım."),
        opt("Yaralıyı sürüklerim", false, "Tehlikeli."),
        opt("Gizlerim", false, "Bildirin."),
      ]},
    })],
    "24-48": [mk("2. gün", ["canta:su", "canta:gida"], {
      yetiskin: { prompt: "Su-gıda?", options: [
        opt("Çanta + resmi yardım", true, "Stok kritik."),
        opt("Kaynak sudan içerim", false, "Kirli."),
        opt("Hiç yemem", false, "Enerji."),
        opt("Plan yapmam", false, "Plan şart."),
      ]},
      aile: { prompt: "Aile su-gıda?", options: [
        opt("Çocuklara öncelikli paylaşım", true, "Adil paylaşım."),
        opt("Yetişkinler önce", false, "Çocuklar öncelik."),
        opt("Sadece çikolata", false, "Dengeli."),
        opt("Hiç plan yok", false, "Plan."),
      ]},
      yasli: { prompt: "Ulaşım kesik; stok?", options: [
        opt("Çanta stoğu, komşu paylaşımı", true, "Kırsalda stok hayati."),
        opt("Aç kalırım", false, "Risk."),
        opt("Kirli sudan içerim", false, "Sağlık."),
        opt("İlaçsız kalırım", false, "İlaç alın."),
      ]},
      ogrenci: { prompt: "Yurt dağıtımı?", options: [
        opt("Resmi dağıtım + çanta", true, "Güvenli."),
        opt("Hiç su içmem", false, "Gerekli."),
        opt("Dışarıdan her şey", false, "Kesilebilir."),
        opt("Stok çalamam", false, "Paylaşın."),
      ]},
    })],
    "48-72": [mk("3. gün", ["plan:notes", "canta:ilac"], {
      yetiskin: { prompt: "Eve dönüş?", options: [
        opt("Uzman onayı beklerim", true, "Güvenlik."),
        opt("Hemen girerim", false, "Kayma riski."),
        opt("Eşya toplarım", false, "Önce onay."),
        opt("Yalnız girerim", false, "Refakat."),
      ]},
      aile: { prompt: "Çocuklarla dönüş?", options: [
        opt("Onay + çocukları güvenli alanda tutarım", true, "Çocuklar riskli yapıya girmesin."),
        opt("Çocukları önce gönderirim", false, "Önce onay."),
        opt("Çocuklara korku anlatırım", false, "Sade dil."),
        opt("Hemen gireriz", false, "Onay."),
      ]},
      yasli: { prompt: "Eve dönüş planı?", options: [
        opt("Onay + refakat + ilaç kontrolü", true, "Güvenli dönüş."),
        opt("Tek başıma girerim", false, "Düşme."),
        opt("Merdiveni hızlı çıkarım", false, "Risk."),
        opt("İlaçsız girerim", false, "İlaç alın."),
      ]},
      ogrenci: { prompt: "Yurda dönüş?", options: [
        opt("Yurt onayı beklerim", true, "Resmi süreç."),
        opt("Zorla girerim", false, "Güvenlik."),
        opt("Eşya için hemen", false, "Onay."),
        opt("Aileye habersiz", false, "Yol güvenliği."),
      ]},
    })],
  };
}

disasters.sel = {
  label: "Sel / Taşkın",
  eventIntro: "Saat {time}'te şiddetli yağış sonrası sel uyarısı ve su yükselmesi başladı.",
  eventIntroByChar: {
    yetiskin: "Saat {time}'te yalnız evdeyken sel uyarısı aldınız.",
    aile: "Saat {time}'te çocuklarla birlikte sel uyarısı geldi.",
    yasli: "Saat {time}'te sel uyarısı; merdiven inmek zor.",
    ogrenci: "Saat {time}'te yurtta sel ve tahliye anonsu yapıldı.",
  },
  phases: selPhases(),
};

disasters.yangin = {
  label: "Orman yangını",
  eventIntro: "Saat {time}'te yakınınızdaki ormanlık alanda yangın başladı.",
  eventIntroByChar: {
    yetiskin: "Saat {time}'te tek başınıza duman kokusu aldınız.",
    aile: "Saat {time}'te çocuklarla birlikte yangın tahliyesi başladı.",
    yasli: "Saat {time}'te yangın uyarısı; yavaş hareket ediyorsunuz.",
    ogrenci: "Saat {time}'te yurtta yangın alarmı çaldı.",
  },
  phases: yanginPhases(),
};

disasters.heyelan = {
  label: "Heyelan",
  eventIntro: "Saat {time}'te şiddetli yağış sonrası heyelan uyarısı yapıldı.",
  eventIntroByChar: {
    yetiskin: "Saat {time}'te yamaç altında heyelan riski uyarısı aldınız.",
    aile: "Saat {time}'te çocukları uyandırıp heyelan uyarısı geldi.",
    yasli: "Saat {time}'te heyelan sesi; komşu yardımı gerekebilir.",
    ogrenci: "Saat {time}'te yurtta heyelan ve tahliye uyarısı yapıldı.",
  },
  phases: heyelanPhases(),
};

const out = {
  phases,
  characters,
  environments,
  disasters,
  prepLabels: {
    "canta:su": "Su stoğu",
    "canta:gida": "Dayanıklı gıda",
    "canta:ilkYardim": "İlk yardım seti",
    "canta:ilac": "Kişisel ilaçlar",
    "canta:fener": "Fener / pil",
    "canta:powerbank": "Powerbank",
    "canta:radyo": "Pilli radyo",
    "canta:battaniye": "Battaniye",
    "canta:hijyen": "Hijyen seti",
    "canta:belge": "Belge kopyaları",
    "canta:duuduk": "Düdük",
    "plan:meeting1": "Buluşma noktası (1)",
    "plan:meeting2": "Buluşma noktası (2)",
    "plan:outContact": "Şehir dışı irtibat",
    "plan:familyName": "Aile planı",
    "plan:notes": "Plan notları",
  },
};

const outPath = path.join(__dirname, "..", "data", "ilk-72-saat.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log("Wrote", outPath);
