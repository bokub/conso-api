# Blocage par IP dans Conso API

⚠️ **Vous avez une erreur 403 « Sorry, you have been blocked » ?**

Ce n’est pas une panne : votre adresse IP est bloquée. **Aucun déblocage ne sera effectué sur demande**, et **toute réclamation sera ignorée** (issue GitHub, e-mail, LinkedIn, Facebook…). [Détails ci-dessous](#si-votre-ip-est-bloquée).

👋 **Vous découvrez Conso API ?** Lisez la section [Si vous voulez éviter d’être bloqué](#si-vous-voulez-éviter-dêtre-bloqué) avant de l’intégrer à votre installation. Une fois bloqué, il sera trop tard.

Si vous utilisez le module [HA-Linky](https://github.com/bokub/ha-linky) pour Home Assistant, il ne fait que 2 requêtes par jour et par PRM au maximum. Il respecte les règles et ne peut pas provoquer de blocage.

---

## Si votre IP est bloquée

Votre adresse IP a généré un volume de requêtes jugé excessif. Elle a été bloquée automatiquement, sans avertissement.

- **Le blocage peut durer plusieurs mois, voire être définitif.**
- **Aucune durée de blocage n’est garantie.**

### Ce que vous pouvez faire

- **Arrêter d’envoyer des requêtes depuis l’IP bloquée** : elles sont rejetées et ne servent à rien.
- **Comprendre ce qui a provoqué le blocage et y mettre fin** : automatisation, intégration ou agent IA qui envoie trop de requêtes (voir [les règles](#si-vous-voulez-éviter-dêtre-bloqué)).

### Ne me contactez pas à ce sujet

🚫 **Aucun déblocage manuel ne sera effectué sur demande.** Inutile de chercher à négocier ou à réclamer une exception.

Je reçois **plusieurs fois par semaine** des réclamations de personnes dont l’IP a été bloquée. Ces sollicitations :

- polluent les issues GitHub concernant les véritables problèmes ;
- m’envoient des e-mails et des notifications à toute heure, en semaine comme en week-end ;
- me suivent parfois jusque sur LinkedIn ou même Facebook, où des gens me contactent directement.

Ces comportements sont **indésirables** et **inacceptables**.

Conso API est un projet personnel, gratuit, maintenu sur mon temps libre. Je ne compte pas consacrer ce temps à examiner les circonstances de chaque blocage, décider qui mérite une seconde chance ou supprimer des adresses IP à la main.

Vous avez identifié le problème ? **C’est trop tard.** Explications, excuses et promesses n’y changeront rien : inutile de me contacter, je ne débloquerai pas l’IP manuellement.

- Toute issue GitHub réclamant un déblocage sera **fermée immédiatement, sans réponse**.
- Les messages privés et les sollicitations sur mes autres canaux seront **ignorés, voire signalés**.

Merci de respecter cette règle, ainsi que mon temps personnel et mon droit de ne pas être sollicité.

### Et si mon adresse IP est partagée ?

Certains fournisseurs d’accès utilisent des adresses IP partagées entre plusieurs clients (CGNAT). C’est aussi le cas de certains hébergeurs, VPN et proxys.

Vous pouvez donc être bloqué à cause du comportement d’un autre utilisateur de la même adresse IP. Conso API ne peut pas distinguer les utilisateurs derrière une même IP : **un blocage peut affecter plusieurs personnes.** Seule piste si c’est votre cas : utiliser une adresse IP non partagée.

---

## Pourquoi des IP sont-elles bloquées ?

Conso API repose sur les quotas accordés par Enedis. Ceux-ci sont **limités** et **partagés** entre l’ensemble des utilisateurs du service.

Le nombre d’utilisateurs augmente, et maintenir le service dans ces conditions représente déjà une charge importante. Pourtant, certains comportements continuent de pénaliser tout le monde :

- Effectuer des requêtes en boucle, parfois toutes les minutes.
- Multiplier les tentatives lorsque les données ne sont pas encore disponibles.
- Relancer automatiquement les requêtes après chaque erreur, sans limite.
- Déclencher des synchronisations massives ou répétées, notamment après un redémarrage.

Ces comportements sont inutiles et nuisent directement aux autres utilisateurs.

Un seul appel à Conso API permet de récupérer toutes les données disponibles pour un PRM sur l’intervalle d’**une semaine entière**. Il n’y a donc **aucune raison** d’interroger le service toutes les minutes ou plusieurs dizaines de fois par jour.

**Un comportement abusif entraîne le blocage de l’adresse IP dans les 12 heures qui suivent.**

### Le blocage est indispensable au fonctionnement du service

- **Environ 70 % du trafic reçu par Conso API provient d’adresses IP déjà bloquées.**
- Certaines adresses IP sollicitent l’API plusieurs milliers de fois par jour, parfois plusieurs fois par minute, alors qu’elles sont bloquées depuis plusieurs mois.

Sans ces protections, les requêtes abusives satureraient les quotas disponibles et pénaliseraient l’ensemble des utilisateurs. **Conso API ne pourrait tout simplement pas continuer à fonctionner.**

---

## Si vous voulez éviter d’être bloqué

Les données Enedis sont mises à jour une fois par jour. Les interroger dix, cent ou mille fois ne les rendra pas plus récentes.

- **Une seule requête quotidienne par PRM** est normalement suffisante. Deux ou trois appels par jour, retries compris, sont un maximum raisonnable.
- **Pas de boucle de retry infinie.** En cas d’erreur ou de données pas encore disponibles, une nouvelle tentative quelques minutes ou quelques heures plus tard suffit. Si le problème persiste, attendez le lendemain.
- **Vérifiez vos automatisations après un redémarrage** de Home Assistant ou d’un autre service.
- **Pour récupérer tout votre historique de consommation, utilisez [Conso Downloader](https://chromewebstore.google.com/detail/conso-downloader/geldaniiglcfekimaghpdiiabjaflllp)**, une extension Chrome que j’ai développée pour cet usage ([code source sur GitHub](https://github.com/bokub/conso-downloader)). Inutile de multiplier les requêtes pour récupérer vos anciennes données.

Pour les bonnes pratiques et les horaires de disponibilité des données, consultez la [page d’accueil de Conso API](https://conso.boris.sh/).

### Vous utilisez un LLM ou un agent IA ?

Soyez particulièrement vigilant : un agent IA peut facilement multiplier les appels pour vérifier une information, réessayer après une erreur ou lancer plusieurs requêtes en parallèle.

Ne partez pas du principe qu’un LLM connaît ces contraintes : **c’est à vous de les lui préciser.** Vous pouvez copier-coller ceci dans ses instructions :

```text
Règles d’utilisation de Conso API :
- 1 appel par jour et par PRM. 2 à 3 maximum, retries compris.
- Jamais de requêtes en boucle ni en parallèle.
- Pas de retry automatique après chaque erreur : une nouvelle tentative
  quelques heures plus tard au plus, sinon attendre le lendemain.
- Les données sont mises à jour une fois par jour : inutile de les
  interroger plus souvent.
```

---

## Pourquoi un blocage par IP, et sans avertissement ?

C’est une conséquence directe d’un choix de conception : Conso API est pensé pour **respecter votre vie privée** au maximum (privacy first).

- Je ne stocke ni les PRM des utilisateurs, ni l’historique des requêtes par PRM. Je ne peux donc pas mesurer l’utilisation de chaque PRM, ni identifier précisément les utilisateurs à l’origine d’une surcharge.
- Le journal des appels, avec les adresses IP, est conservé 7 jours maximum. Une fois une IP bloquée, elle est gardée en mémoire dans un pare-feu pour la durée du blocage. C’est le seul élément technique dont je dispose pour limiter les abus.
- Conso API ne nécessite aucun compte et ne collecte pas votre adresse e-mail. Je n’ai donc aucun moyen de vous prévenir avant un blocage.

Le blocage par IP n’est pas un choix de confort : c’est la conséquence de mon engagement à ne pas collecter de données permettant de suivre individuellement l’utilisation du service.
