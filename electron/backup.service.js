const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

class BackupService {
  constructor() {
    this.dbPath = path.join(__dirname, 'pos_database.db');
  }

  /**
   * Crear backup de la base de datos
   */
  async createBackup() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        throw new Error('Base de datos no encontrada');
      }

      // Mostrar diálogo para seleccionar ubicación de guardado
      const result = await dialog.showSaveDialog({
        title: 'Guardar backup de la base de datos',
        defaultPath: `DRT_POS_Backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.db`,
        filters: [
          { name: 'Backup Database', extensions: ['db'] },
          { name: 'Todos los archivos', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Operación cancelada por el usuario' };
      }

      // Copiar base de datos a la ubicación seleccionada
      const dbData = fs.readFileSync(this.dbPath);
      fs.writeFileSync(result.filePath, dbData);

      // Crear archivo de información del backup
      const backupInfo = {
        createdAt: new Date().toISOString(),
        originalPath: this.dbPath,
        version: '1.0',
        tables: await this.getTableInfo()
      };

      const infoPath = result.filePath.replace('.db', '_info.json');
      fs.writeFileSync(infoPath, JSON.stringify(backupInfo, null, 2));

      return {
        success: true,
        message: 'Backup creado exitosamente',
        filePath: result.filePath,
        infoPath: infoPath
      };

    } catch (error) {
      console.error('Error creando backup:', error);
      return {
        success: false,
        message: `Error creando backup: ${error.message}`
      };
    }
  }

  /**
   * Restaurar backup desde archivo
   */
  async restoreBackup() {
    try {
      // Mostrar diálogo para seleccionar archivo de backup
      const result = await dialog.showOpenDialog({
        title: 'Seleccionar archivo de backup',
        filters: [
          { name: 'Backup Database', extensions: ['db'] },
          { name: 'Todos los archivos', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: 'Operación cancelada por el usuario' };
      }

      const backupPath = result.filePaths[0];

      if (!fs.existsSync(backupPath)) {
        throw new Error('Archivo de backup no encontrado');
      }

      // Confirmar la restauración
      const confirmResult = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Sí, restaurar', 'Cancelar'],
        defaultId: 1,
        title: 'Confirmar restauración',
        message: '¿Está seguro de restaurar este backup?',
        detail: 'Esta acción reemplazará completamente la base de datos actual. Se recomienda crear un backup antes de continuar.'
      });

      if (confirmResult.response !== 0) {
        return { success: false, message: 'Restauración cancelada por el usuario' };
      }

      // Crear backup de la base actual antes de restaurar
      const currentBackupName = `Backup_Antes_Restauracion_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.db`;
      const currentBackupPath = path.join(path.dirname(this.dbPath), currentBackupName);
      
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, currentBackupPath);
      }

      // Restaurar backup
      const backupData = fs.readFileSync(backupPath);
      fs.writeFileSync(this.dbPath, backupData);

      return {
        success: true,
        message: 'Backup restaurado exitosamente',
        currentBackupPath: currentBackupPath,
        restoredFrom: backupPath
      };

    } catch (error) {
      console.error('Error restaurando backup:', error);
      return {
        success: false,
        message: `Error restaurando backup: ${error.message}`
      };
    }
  }

  /**
   * Obtener información de las tablas de la base de datos
   */
  async getTableInfo() {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(this.dbPath);
      
      // Obtener lista de tablas
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
      
      const tableInfo = {};
      for (const table of tables) {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        tableInfo[table.name] = count.count;
      }
      
      db.close();
      return tableInfo;
    } catch (error) {
      console.error('Error obteniendo información de tablas:', error);
      return {};
    }
  }

  /**
   * Verificar integridad del archivo de backup
   */
  async verifyBackup(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, message: 'Archivo no encontrado' };
      }

      // Intentar abrir la base de datos para verificar integridad
      const Database = require('better-sqlite3');
      const db = new Database(filePath, { readonly: true });
      
      // Verificar que se pueden leer las tablas principales
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
      db.close();

      if (tables.length === 0) {
        return { valid: false, message: 'El archivo no contiene tablas válidas' };
      }

      return { 
        valid: true, 
        message: 'Backup válido',
        tables: tables.map(t => t.name)
      };

    } catch (error) {
      return { 
        valid: false, 
        message: `Archivo corrupto o inválido: ${error.message}` 
      };
    }
  }

  /**
   * Obtener estadísticas de la base de datos actual
   */
  async getDatabaseStats() {
    try {
      const stats = fs.statSync(this.dbPath);
      const tableInfo = await this.getTableInfo();

      return {
        success: true,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        lastModified: stats.mtime,
        tables: tableInfo,
        totalRecords: Object.values(tableInfo).reduce((sum, count) => sum + count, 0)
      };

    } catch (error) {
      return {
        success: false,
        message: `Error obteniendo estadísticas: ${error.message}`
      };
    }
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = BackupService;