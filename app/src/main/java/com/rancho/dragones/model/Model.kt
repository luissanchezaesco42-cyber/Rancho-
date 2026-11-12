package com.rancho.dragones.model

/** Los seis elementos del juego, con colores para el dibujo por código. */
enum class Element(val label: String, val color: Int, val dark: Int) {
    FUEGO("Fuego", 0xFFFF6B35.toInt(), 0xFFB23A12.toInt()),
    AGUA("Agua", 0xFF3FA7FF.toInt(), 0xFF1B6BB5.toInt()),
    PLANTA("Planta", 0xFF59C45B.toInt(), 0xFF2E8A31.toInt()),
    TIERRA("Tierra", 0xFFB5834F.toInt(), 0xFF7A5230.toInt()),
    AIRE("Aire", 0xFFB9E6F5.toInt(), 0xFF6FB3CC.toInt()),
    RAYO("Rayo", 0xFFFFD93B.toInt(), 0xFFC49A00.toInt());

    /** Elementos a los que este elemento tiene ventaja. */
    fun beats(): Set<Element> = when (this) {
        FUEGO -> setOf(PLANTA, AIRE)
        AGUA -> setOf(FUEGO, RAYO)
        PLANTA -> setOf(AGUA, TIERRA)
        TIERRA -> setOf(FUEGO, RAYO)
        RAYO -> setOf(PLANTA, AIRE)
        AIRE -> setOf(AGUA, TIERRA)
    }
}

/** Una especie de dragón. Las básicas tienen un solo elemento; las híbridas, dos. */
data class Species(
    val id: String,
    val nombre: String,
    val primary: Element,
    val secondary: Element?,
    val baseHp: Int,
    val baseAtk: Int,
    val goldPerMin: Double,
    val incubationSec: Int,
    val price: Int, // 0 = no se vende en la tienda
) {
    val elements: List<Element> get() = listOfNotNull(primary, secondary)
    val tier: Int get() = if (secondary == null) 1 else 2
}

object SpeciesCatalog {
    private fun basic(id: String, nombre: String, e: Element) =
        Species(id, nombre, e, null, baseHp = 100, baseAtk = 14, goldPerMin = 3.0, incubationSec = 60, price = 300)

    private fun hybrid(id: String, nombre: String, a: Element, b: Element) =
        Species(id, nombre, a, b, baseHp = 140, baseAtk = 20, goldPerMin = 7.0, incubationSec = 180, price = 0)

    val basics: List<Species> = listOf(
        basic("pyrion", "Pyrion", Element.FUEGO),
        basic("aquor", "Aquor", Element.AGUA),
        basic("floravis", "Floravis", Element.PLANTA),
        basic("terrax", "Terrax", Element.TIERRA),
        basic("zefiro", "Zéfiro", Element.AIRE),
        basic("voltrix", "Voltrix", Element.RAYO),
    )

    val hybrids: List<Species> = listOf(
        hybrid("solarion", "Solarion", Element.FUEGO, Element.AIRE),
        hybrid("cienaga", "Ciénaga", Element.AGUA, Element.TIERRA),
        hybrid("esporal", "Esporal", Element.PLANTA, Element.AIRE),
        hybrid("magmor", "Magmor", Element.FUEGO, Element.TIERRA),
        hybrid("tormentis", "Tormentis", Element.AGUA, Element.RAYO),
        hybrid("geodrak", "Geodrak", Element.TIERRA, Element.RAYO),
    )

    val all: List<Species> = basics + hybrids

    private val byId: Map<String, Species> = all.associateBy { it.id }

    fun get(id: String): Species = byId[id] ?: error("Especie desconocida: $id")

    fun basicOf(e: Element): Species = basics.first { it.primary == e }

    /** Receta de fusión: pareja de elementos -> especie híbrida. */
    fun hybridFor(a: Element, b: Element): Species? {
        val pair = setOf(a, b)
        return hybrids.firstOrNull { it.elements.toSet() == pair }
    }
}

class Dragon(val id: Long, val speciesId: String, var level: Int = 1, var xp: Int = 0) {
    val species: Species get() = SpeciesCatalog.get(speciesId)
}

class Habitat(
    val id: Long,
    val element: Element,
    val slot: Int,
    val dragonIds: MutableList<Long> = mutableListOf(),
    var pendingGold: Double = 0.0,
)

/** Huevo en incubación. Los padres se guardan solo para mostrarlos en pantalla. */
class Egg(val speciesId: String, val readyAt: Long, val parentA: String, val parentB: String)

class GameState(
    var gold: Long,
    var gems: Int,
    var food: Int,
    val dragons: MutableList<Dragon> = mutableListOf(),
    val habitats: MutableList<Habitat> = mutableListOf(),
    val eggs: MutableList<Egg> = mutableListOf(),
    var nextId: Long = 1,
    var lastTickAt: Long = 0,
    var wave: Int = 1,
    var bestWave: Int = 0,
) {
    fun newId(): Long = nextId++

    fun dragon(id: Long): Dragon? = dragons.firstOrNull { it.id == id }

    fun habitatOf(dragonId: Long): Habitat? = habitats.firstOrNull { dragonId in it.dragonIds }

    companion object {
        /** Partida nueva: una isla con un hábitat de fuego y un Pyrion. */
        fun newGame(now: Long): GameState {
            val s = GameState(gold = 600, gems = 5, food = 5, lastTickAt = now)
            val d = Dragon(s.newId(), "pyrion")
            s.dragons.add(d)
            s.habitats.add(Habitat(s.newId(), Element.FUEGO, slot = 4, dragonIds = mutableListOf(d.id)))
            return s
        }
    }
}
