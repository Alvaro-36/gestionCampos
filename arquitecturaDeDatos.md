@startuml diagrama_finca_v2_balanceado

' Configuración de flujo horizontal con espaciado moderado
left to right direction
skinparam nodesep 40
skinparam ranksep 60
skinparam linetype ortho

skinparam class {
    AttributeIconSize 0
    FontStyle bold
    FontSize 13
    BackgroundColor #F8F8F8
    BorderColor #888888
    ArrowColor #555555
}

class User {
  + uid: string <<Firebase Auth>>
  + firstName: string
  + lastName: string
  + email: string
  + accesses: Access[]
}

class Access <<embedded>> {
  + farmId: string
  + role: string
}

class Farm {
  + id: string
  + name: string
  + centerCoordinates: [number, number]
  + userIds: string[]
}

class Field {
  + id: string
  + name: string
  + totalArea: number
  + area: PolygonVertices
  + description: string
  + tags: string[]
}

' Path: farms/{farmId}/seasons/{seasonId}
class Season {
  + id: string
  + name: string
  + startDate: timestamp
  + endDate: timestamp
  + estimatedPricePerKg: number
  + realPricePerKg: number
  + kilosObtained: number
  + fieldIds: string[]
}

' Path: farms/{farmId}/seasons/{seasonId}/tasks/{taskId}
class Task {
  + id: string
  + dateTime: timestamp
  + name: string
  + description: string
  + affectedFields: string[]
  + appliedProducts: AppliedProduct[]
}

' Path: farms/{farmId}/products/{productId}
class Product <<catalogo>> {
  + id: string
  + farmId: string
  + name: string
  + unit: string
}

class AppliedProduct <<embedded>> {
  + productId: string
  + name: string
  + quantity: number
  + unit: string
  + estimatedPrice: number
  + realPrice: number
}

' --- Relaciones ---

User *-down-> Access : embeds
User -right-> Farm : accede via Access.farmId

Farm "1" *-- "n" Field : subcoleccion
Farm "1" *-- "n" Season : subcoleccion
Season "1" *-- "n" Task : subcoleccion

' Relaciones de referencia y catalogo
Task "n" ..> "n" Field : ref via affectedFields[]
Farm "1" -- "n" Product : catalogo
Task *-down-> AppliedProduct : embeds
AppliedProduct ..up.> Product : ref snapshot

' Notas posicionadas para no obstruir el flujo horizontal
note bottom of Access
  Embebido en User.
  No es coleccion propia.
end note

note top of Farm
  Tambien referencia a usuarios
  via userIds: string[] para
  consultas inversas (listByUser).
end note

note bottom of Product
  Catalogo por finca.
  Path: farms/{farmId}/products/
end note

note bottom of AppliedProduct
  Snapshot del nombre y
  precios al momento del trabajo.
end note

note right of Task
  affectedFields[] permite que
  un Task afecte multiples Fields
  sin ser subcol de cada uno.
end note

@enduml