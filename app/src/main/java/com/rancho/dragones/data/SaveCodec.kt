package com.rancho.dragones.data

import com.rancho.dragones.model.Dragon
import com.rancho.dragones.model.Egg
import com.rancho.dragones.model.Element
import com.rancho.dragones.model.GameState
import com.rancho.dragones.model.Habitat
import org.json.JSONArray
import org.json.JSONObject

/** Convierte la partida a JSON y de vuelta. No toca el sistema de archivos. */
object SaveCodec {
    private const val VERSION = 1

    fun encode(s: GameState): String {
        val o = JSONObject()
        o.put("version", VERSION)
        o.put("gold", s.gold)
        o.put("gems", s.gems)
        o.put("food", s.food)
        o.put("nextId", s.nextId)
        o.put("lastTickAt", s.lastTickAt)
        o.put("wave", s.wave)
        o.put("bestWave", s.bestWave)
        o.put("dragons", JSONArray().also { arr ->
            s.dragons.forEach { d ->
                arr.put(JSONObject().put("id", d.id).put("species", d.speciesId).put("level", d.level).put("xp", d.xp))
            }
        })
        o.put("habitats", JSONArray().also { arr ->
            s.habitats.forEach { h ->
                arr.put(
                    JSONObject().put("id", h.id).put("element", h.element.name).put("slot", h.slot)
                        .put("pending", h.pendingGold)
                        .put("dragons", JSONArray().also { ids -> h.dragonIds.forEach { ids.put(it) } })
                )
            }
        })
        o.put("eggs", JSONArray().also { arr ->
            s.eggs.forEach { e ->
                arr.put(
                    JSONObject().put("species", e.speciesId).put("readyAt", e.readyAt)
                        .put("a", e.parentA).put("b", e.parentB)
                )
            }
        })
        return o.toString()
    }

    fun decode(text: String): GameState {
        val o = JSONObject(text)
        val s = GameState(
            gold = o.getLong("gold"),
            gems = o.getInt("gems"),
            food = o.getInt("food"),
            nextId = o.getLong("nextId"),
            lastTickAt = o.getLong("lastTickAt"),
            wave = o.optInt("wave", 1),
            bestWave = o.optInt("bestWave", 0),
        )
        val dragons = o.getJSONArray("dragons")
        for (i in 0 until dragons.length()) {
            val d = dragons.getJSONObject(i)
            s.dragons.add(Dragon(d.getLong("id"), d.getString("species"), d.getInt("level"), d.getInt("xp")))
        }
        val habitats = o.getJSONArray("habitats")
        for (i in 0 until habitats.length()) {
            val h = habitats.getJSONObject(i)
            val ids = h.getJSONArray("dragons")
            s.habitats.add(
                Habitat(
                    h.getLong("id"), Element.valueOf(h.getString("element")), h.getInt("slot"),
                    MutableList(ids.length()) { ids.getLong(it) }, h.getDouble("pending"),
                )
            )
        }
        val eggs = o.getJSONArray("eggs")
        for (i in 0 until eggs.length()) {
            val e = eggs.getJSONObject(i)
            s.eggs.add(Egg(e.getString("species"), e.getLong("readyAt"), e.getString("a"), e.getString("b")))
        }
        return s
    }
}
