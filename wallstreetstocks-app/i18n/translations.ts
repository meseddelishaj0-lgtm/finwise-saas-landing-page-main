// App translations. Keys are the ENGLISH strings themselves — t("Market
// Overview") returns the translation for the active language, or the key
// (English) if none exists. A missing translation can never break a screen.
//
// Base UI dictionaries below cover settings/tabs/common; the big per-screen
// string dictionaries live in i18n/strings.<lang>.ts and are merged on top.

import es_strings from "./strings.es";
import pt_strings from "./strings.pt";
import fr_strings from "./strings.fr";
import de_strings from "./strings.de";
import it_strings from "./strings.it";
import sq_strings from "./strings.sq";
import tr_strings from "./strings.tr";
import el_strings from "./strings.el";
import zh_strings from "./strings.zh";

export interface Language {
  code: string;
  name: string;
  native: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇧🇷" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "sq", name: "Albanian", native: "Shqip", flag: "🇦🇱" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "zh", name: "Chinese", native: "中文", flag: "🇨🇳" },
];

type Dict = Record<string, string>;

const es: Dict = {
  "Home": "Inicio", "Markets": "Mercados", "Trending": "Tendencias", "AI": "IA",
  "Social": "Social", "Screen": "Filtro",
  "Settings": "Ajustes", "Personal Info": "Información personal", "Display": "Pantalla",
  "Experience": "Experiencia", "Notifications": "Notificaciones", "Password": "Contraseña",
  "Muted": "Silenciados", "Blocked": "Bloqueados", "Language": "Idioma",
  "Danger Zone": "Zona de peligro", "Delete Account": "Eliminar cuenta",
  "Choose your preferred language": "Elige tu idioma preferido",
  "Changes apply instantly across the app.": "Los cambios se aplican al instante en toda la app.",
  "Save": "Guardar", "Cancel": "Cancelar", "Done": "Listo", "Retry": "Reintentar",
  "Loading…": "Cargando…", "Search": "Buscar", "Error": "Error", "See All": "Ver todo",
  "Close": "Cerrar", "Back": "Atrás",
};

const pt: Dict = {
  "Home": "Início", "Markets": "Mercados", "Trending": "Em Alta", "AI": "IA",
  "Social": "Social", "Screen": "Filtro",
  "Settings": "Configurações", "Personal Info": "Informações pessoais", "Display": "Exibição",
  "Experience": "Experiência", "Notifications": "Notificações", "Password": "Senha",
  "Muted": "Silenciados", "Blocked": "Bloqueados", "Language": "Idioma",
  "Danger Zone": "Zona de perigo", "Delete Account": "Excluir conta",
  "Choose your preferred language": "Escolha seu idioma preferido",
  "Changes apply instantly across the app.": "As alterações são aplicadas instantaneamente em todo o app.",
  "Save": "Salvar", "Cancel": "Cancelar", "Done": "Concluído", "Retry": "Tentar novamente",
  "Loading…": "Carregando…", "Search": "Buscar", "Error": "Erro", "See All": "Ver tudo",
  "Close": "Fechar", "Back": "Voltar",
};

const fr: Dict = {
  "Home": "Accueil", "Markets": "Marchés", "Trending": "Tendances", "AI": "IA",
  "Social": "Social", "Screen": "Filtre",
  "Settings": "Paramètres", "Personal Info": "Infos personnelles", "Display": "Affichage",
  "Experience": "Expérience", "Notifications": "Notifications", "Password": "Mot de passe",
  "Muted": "Masqués", "Blocked": "Bloqués", "Language": "Langue",
  "Danger Zone": "Zone de danger", "Delete Account": "Supprimer le compte",
  "Choose your preferred language": "Choisissez votre langue préférée",
  "Changes apply instantly across the app.": "Les changements s'appliquent instantanément dans toute l'app.",
  "Save": "Enregistrer", "Cancel": "Annuler", "Done": "Terminé", "Retry": "Réessayer",
  "Loading…": "Chargement…", "Search": "Rechercher", "Error": "Erreur", "See All": "Tout voir",
  "Close": "Fermer", "Back": "Retour",
};

const de: Dict = {
  "Home": "Start", "Markets": "Märkte", "Trending": "Trends", "AI": "KI",
  "Social": "Social", "Screen": "Filter",
  "Settings": "Einstellungen", "Personal Info": "Persönliche Daten", "Display": "Anzeige",
  "Experience": "Erlebnis", "Notifications": "Benachrichtigungen", "Password": "Passwort",
  "Muted": "Stummgeschaltet", "Blocked": "Blockiert", "Language": "Sprache",
  "Danger Zone": "Gefahrenzone", "Delete Account": "Konto löschen",
  "Choose your preferred language": "Wähle deine bevorzugte Sprache",
  "Changes apply instantly across the app.": "Änderungen werden sofort in der ganzen App übernommen.",
  "Save": "Speichern", "Cancel": "Abbrechen", "Done": "Fertig", "Retry": "Erneut versuchen",
  "Loading…": "Lädt…", "Search": "Suchen", "Error": "Fehler", "See All": "Alle anzeigen",
  "Close": "Schließen", "Back": "Zurück",
};

const it: Dict = {
  "Home": "Home", "Markets": "Mercati", "Trending": "Tendenze", "AI": "IA",
  "Social": "Social", "Screen": "Filtro",
  "Settings": "Impostazioni", "Personal Info": "Info personali", "Display": "Schermo",
  "Experience": "Esperienza", "Notifications": "Notifiche", "Password": "Password",
  "Muted": "Silenziati", "Blocked": "Bloccati", "Language": "Lingua",
  "Danger Zone": "Zona di pericolo", "Delete Account": "Elimina account",
  "Choose your preferred language": "Scegli la tua lingua preferita",
  "Changes apply instantly across the app.": "Le modifiche si applicano all'istante in tutta l'app.",
  "Save": "Salva", "Cancel": "Annulla", "Done": "Fatto", "Retry": "Riprova",
  "Loading…": "Caricamento…", "Search": "Cerca", "Error": "Errore", "See All": "Vedi tutto",
  "Close": "Chiudi", "Back": "Indietro",
};

const sq: Dict = {
  "Home": "Kryefaqja", "Markets": "Tregjet", "Trending": "Në Trend", "AI": "IA",
  "Social": "Sociale", "Screen": "Filtri",
  "Settings": "Cilësimet", "Personal Info": "Të dhënat personale", "Display": "Ekrani",
  "Experience": "Përvoja", "Notifications": "Njoftimet", "Password": "Fjalëkalimi",
  "Muted": "Të heshtur", "Blocked": "Të bllokuar", "Language": "Gjuha",
  "Danger Zone": "Zona e rrezikut", "Delete Account": "Fshi llogarinë",
  "Choose your preferred language": "Zgjidh gjuhën e preferuar",
  "Changes apply instantly across the app.": "Ndryshimet zbatohen menjëherë në gjithë aplikacionin.",
  "Save": "Ruaj", "Cancel": "Anulo", "Done": "U krye", "Retry": "Provo përsëri",
  "Loading…": "Duke u ngarkuar…", "Search": "Kërko", "Error": "Gabim", "See All": "Shiko të gjitha",
  "Close": "Mbyll", "Back": "Kthehu",
};

const tr: Dict = {
  "Home": "Ana Sayfa", "Markets": "Piyasalar", "Trending": "Trendler", "AI": "YZ",
  "Social": "Sosyal", "Screen": "Tarama",
  "Settings": "Ayarlar", "Personal Info": "Kişisel Bilgiler", "Display": "Görünüm",
  "Experience": "Deneyim", "Notifications": "Bildirimler", "Password": "Şifre",
  "Muted": "Sessize Alınanlar", "Blocked": "Engellenenler", "Language": "Dil",
  "Danger Zone": "Tehlike Bölgesi", "Delete Account": "Hesabı Sil",
  "Choose your preferred language": "Tercih ettiğin dili seç",
  "Changes apply instantly across the app.": "Değişiklikler tüm uygulamada anında uygulanır.",
  "Save": "Kaydet", "Cancel": "İptal", "Done": "Bitti", "Retry": "Tekrar dene",
  "Loading…": "Yükleniyor…", "Search": "Ara", "Error": "Hata", "See All": "Tümünü gör",
  "Close": "Kapat", "Back": "Geri",
};

const el: Dict = {
  "Home": "Αρχική", "Markets": "Αγορές", "Trending": "Τάσεις", "AI": "AI",
  "Social": "Κοινότητα", "Screen": "Φίλτρο",
  "Settings": "Ρυθμίσεις", "Personal Info": "Προσωπικά στοιχεία", "Display": "Οθόνη",
  "Experience": "Εμπειρία", "Notifications": "Ειδοποιήσεις", "Password": "Κωδικός",
  "Muted": "Σε σίγαση", "Blocked": "Αποκλεισμένοι", "Language": "Γλώσσα",
  "Danger Zone": "Ζώνη κινδύνου", "Delete Account": "Διαγραφή λογαριασμού",
  "Choose your preferred language": "Επιλέξτε τη γλώσσα σας",
  "Changes apply instantly across the app.": "Οι αλλαγές εφαρμόζονται άμεσα σε όλη την εφαρμογή.",
  "Save": "Αποθήκευση", "Cancel": "Άκυρο", "Done": "Έγινε", "Retry": "Δοκιμή ξανά",
  "Loading…": "Φόρτωση…", "Search": "Αναζήτηση", "Error": "Σφάλμα", "See All": "Δείτε όλα",
  "Close": "Κλείσιμο", "Back": "Πίσω",
};

const zh: Dict = {
  "Home": "首页", "Markets": "市场", "Trending": "热门", "AI": "AI",
  "Social": "社区", "Screen": "筛选",
  "Settings": "设置", "Personal Info": "个人信息", "Display": "显示",
  "Experience": "体验", "Notifications": "通知", "Password": "密码",
  "Muted": "已静音", "Blocked": "已屏蔽", "Language": "语言",
  "Danger Zone": "危险区域", "Delete Account": "删除账户",
  "Choose your preferred language": "选择您的首选语言",
  "Changes apply instantly across the app.": "更改会立即在整个应用中生效。",
  "Save": "保存", "Cancel": "取消", "Done": "完成", "Retry": "重试",
  "Loading…": "加载中…", "Search": "搜索", "Error": "错误", "See All": "查看全部",
  "Close": "关闭", "Back": "返回",
};

// English needs no dictionary — t() returns the key itself.
export const TRANSLATIONS: Record<string, Dict> = {
  en: {},
  es: { ...es, ...es_strings },
  pt: { ...pt, ...pt_strings },
  fr: { ...fr, ...fr_strings },
  de: { ...de, ...de_strings },
  it: { ...it, ...it_strings },
  sq: { ...sq, ...sq_strings },
  tr: { ...tr, ...tr_strings },
  el: { ...el, ...el_strings },
  zh: { ...zh, ...zh_strings },
};
