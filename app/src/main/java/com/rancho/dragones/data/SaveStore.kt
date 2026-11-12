package com.rancho.dragones.data

import android.content.Context
import com.rancho.dragones.model.GameState
import java.io.File

/** Guarda y carga la partida en el almacenamiento interno de la app. */
class SaveStore(context: Context) {
    private val file = File(context.filesDir, "partida.json")
    private val tmp = File(context.filesDir, "partida.json.tmp")

    /** Devuelve la partida guardada, o una nueva si no existe o está dañada. */
    fun load(now: Long): GameState {
        if (!file.exists()) return GameState.newGame(now)
        return try {
            SaveCodec.decode(file.readText())
        } catch (e: Exception) {
            GameState.newGame(now)
        }
    }

    fun save(state: GameState) {
        // Se escribe a un temporal y se renombra para no corromper la partida si se corta a medias.
        tmp.writeText(SaveCodec.encode(state))
        if (!tmp.renameTo(file)) {
            file.writeText(tmp.readText())
            tmp.delete()
        }
    }
}
