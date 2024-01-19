# ⚡ Conso API

> La passerelle open-source pour accéder à vos données Linky

![curl screenshot](https://github.com/bokub/conso-api/assets/17952318/b2b90e90-dce2-464e-a335-669821479388)

**Conso API** est un service **gratuit** et open-source permettant à tous les particuliers d'accéder aux données de consommation et production de leur compteur Linky.

#### Pour commencer à utiliser Conso API, rendez-vous sur [conso.boris.sh](https://conso.boris.sh) !

## Comment utiliser Conso API ?

Vous pouvez récupérer les données de Conso API de plusieurs façons différentes :

- Directement via l'API (plus d'informations dans la [documentation de l'API](https://conso.boris.sh/documentation))
- Via un outil en ligne de commande tel que [@bokub/linky](https://github.com/bokub/linky#readme)
- Avec l'add-on pour Home Assistant [HA Linky](https://github.com/bokub/ha-linky#readme)
- Dans vos propres programmes Node.js via la librairie [@bokub/linky](https://github.com/bokub/linky#readme)

Conso API remplace l'ancien service [conso.vercel.app](https://conso.vercel.app/), qui ne fonctionnera plus à partir du 17 septembre 2023 suite à la fermeture de certaines APIs d'Enedis

## Pourquoi utiliser ce service ?

Les données de votre compteur Linky récupérées tous les jours peuvent être consultées directement sur [votre espace client Enedis](https://mon-compte-client.enedis.fr/).

Enedis propose également des APIs, mais celles-ci **ne sont ouvertes qu'aux entreprises** ayant signé un contrat chez eux. Conso API fait donc office d'entreprise intermédiaire afin de vous donner accès aux API _"Token V3"_ et _"Metering Data V5"_ d'Enedis.

## Mes données sont-elles en sécurité ?

**Oui**, Conso API a été conçu avec la volonté de garantir une sécurité **maximale** à vos données et votre vie privée. Pour respecter cette volonté :

- Conso API est 100% [**open-source**](https://github.com/bokub/conso-api#readme)
- Toutes les données transitent exclusivement sur des serveurs européens
- Conso API n'utilise aucune base de donnée, et ne peut donc **rien** stocker

## Bon à savoir

### Disponibilité des données

Les données sont envoyées **une fois par jour** par les compteurs Linky. Cela ne sert **à rien** de demander plusieurs fois les mêmes données dans la même journée : **elles n’auront pas changé** !

Les données d’une journée ne sont **pas** accessibles en temps réel, il faut attendre le **lendemain de leur mesure**, en général vers 8h, parfois une ou deux heures plus tard. Il est donc **inutile** de lancer une requête à 23h30 ou à 1h du matin en espérant avoir des données fraîches.

Si les données d'une journée ne sont pas encore présentes le lendemain de la mesure à 10h, il est très probable qu’elles soient alors livrées le sur-lendemain vers 8h.

### Limites d'appels

Les quotas suivants sont fixés par Enedis. Ils sont partagés par tous les utilisateurs du service Conso API.

- Maximum de 5 requêtes par seconde
- Maximum de 1000 requêtes par heure

Même si ces quotas peuvent sembler élevés, le serveur de Conso API est limité en ressources, et ne pourra rester gratuit que si tous les utilisateurs se comportent raisonnablement.

### Conseils d'utilisation

Afin d'éviter les appels inutiles, je vous conseille d'effectuer une seule requête par jour, entre 6h et 10h, à un horaire pas trop précis : si vous choisissez _9:00:00_ et que tout le monde fait comme vous, votre requête sera bloquée à cause du quota expliqué plus haut. À _8:34:45_ ? Beaucoup moins probable.

Si la requête ne remonte aucune donnée, vous pouvez réessayer en début d'après-midi. Toujours rien ? Laissez tomber et attendez un jour de plus.

Dans tous les cas, ne soyez pas égoïste et évitez toute requête non nécessaire.


> [!IMPORTANT]  
> Tout abus pourra conduire à un **blocage de votre adresse IP** sans aucun avertissement préalable.
>
> Si votre IP se retrouve bloquée, sachez qu'il ne s'agit pas d'une erreur, mais bien la conséquence d'un abus significatif de votre part.

## Vous avez d'autres questions ?

Pour signaler un bug ou demander une fonctionnalité, n'hésitez pas à ouvrir une [nouvelle issue sur GitHub](https://github.com/bokub/conso-api/issues).

Pour poser une question ou simplement pour discuter, rendez-vous sur l'espace [GitHub discussions](https://github.com/bokub/conso-api/discussions) !

Dans tous les cas, n'essayez pas de me contacter via mon site web `cv.boris.sh` ou mon compte LinkedIn, réservés exclusivement à des demandes **professionnelles**. Toute demande d'aide reçue ailleurs que sur GitHub sera ignorée.
