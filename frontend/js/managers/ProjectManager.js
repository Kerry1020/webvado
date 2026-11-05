/**
 * ProjectManager (Frontend) - Manages project state and API communication
 */
export class ProjectManager {
  constructor(apiClient, eventBus) {
    this.apiClient = apiClient;
    this.eventBus = eventBus;
    this.currentProject = null;
    this.projects = [];
  }

  async loadProjects() {
    try {
      const response = await this.apiClient.get('/api/projects');
      this.projects = response.projects || [];
      this.eventBus.emit('projects:loaded', this.projects);
      return this.projects;
    } catch (error) {
      console.error('[ProjectManager] Failed to load projects:', error);
      throw error;
    }
  }

  async createProject({ name, part, language }) {
    try {
      const project = await this.apiClient.post('/api/projects', {
        name,
        part,
        language
      });

      this.projects.push(project);
      this.eventBus.emit('project:created', project);
      
      return project;
    } catch (error) {
      console.error('[ProjectManager] Failed to create project:', error);
      throw error;
    }
  }

  async openProject(idOrName) {
    try {
      const project = await this.apiClient.get(`/api/projects/${idOrName}`);
      
      this.currentProject = project;
      this.eventBus.emit('project:opened', project);
      
      // Update UI
      const titleBar = document.getElementById('titleBarText');
      if (titleBar) titleBar.textContent = `WebVado - ${project.name} [${project.path}]`;
      
      const statusProject = document.getElementById('statusBarProject');
      if (statusProject) statusProject.textContent = `Project: ${project.name}`;
      
      const statusPart = document.getElementById('statusBarPart');
      if (statusPart) statusPart.textContent = `Part: ${project.part}`;
      
      return project;
    } catch (error) {
      console.error('[ProjectManager] Failed to open project:', error);
      throw error;
    }
  }

  async saveProject() {
    if (!this.currentProject) {
      throw new Error('No project is currently open');
    }

    try {
      // Save current file changes (will be implemented with EditorManager)
      this.eventBus.emit('project:save-requested');
      
      // Update project metadata
      const updated = await this.apiClient.put(
        `/api/projects/${this.currentProject.id}`,
        {
          top_module: this.currentProject.top_module,
          settings: this.currentProject.settings
        }
      );

      this.currentProject = { ...this.currentProject, ...updated };
      this.eventBus.emit('project:saved', this.currentProject);
      
      return this.currentProject;
    } catch (error) {
      console.error('[ProjectManager] Failed to save project:', error);
      throw error;
    }
  }

  async closeProject() {
    if (!this.currentProject) return;

    try {
      const projectName = this.currentProject.name;
      
      this.currentProject = null;
      this.eventBus.emit('project:closed');
      
      // Update UI
      const titleBar = document.getElementById('titleBarText');
      if (titleBar) titleBar.textContent = 'WebVado - No Project Open';
      
      const statusProject = document.getElementById('statusBarProject');
      if (statusProject) statusProject.textContent = 'No Project Open';
      
      const statusPart = document.getElementById('statusBarPart');
      if (statusPart) statusPart.textContent = '-';
      
      console.log(`[ProjectManager] Project "${projectName}" closed`);
    } catch (error) {
      console.error('[ProjectManager] Failed to close project:', error);
      throw error;
    }
  }

  async deleteProject(idOrName) {
    try {
      await this.apiClient.delete(`/api/projects/${idOrName}`);
      
      this.projects = this.projects.filter(
        p => p.id !== idOrName && p.name !== idOrName
      );
      
      if (this.currentProject && 
          (this.currentProject.id === idOrName || this.currentProject.name === idOrName)) {
        await this.closeProject();
      }
      
      this.eventBus.emit('project:deleted', idOrName);
      
      return true;
    } catch (error) {
      console.error('[ProjectManager] Failed to delete project:', error);
      throw error;
    }
  }

  async getProjectFiles(projectId) {
    try {
      const files = await this.apiClient.get(`/api/projects/${projectId}/files`);
      return files;
    } catch (error) {
      console.error('[ProjectManager] Failed to get project files:', error);
      throw error;
    }
  }

  getCurrentProject() {
    return this.currentProject;
  }

  getProjects() {
    return this.projects;
  }
}
