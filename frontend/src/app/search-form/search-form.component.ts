import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // 如果你使用了 ngModel，需要导入 FormsModule

@Component({
  selector: 'app-search-form',
  standalone: true, // 声明为 Standalone 组件
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.css'],
  imports: [FormsModule] // 如果需要用到 ngModel
})
export class SearchFormComponent {
  street: string = '';
  city: string = '';
  state: string = '';
  useCurrentLocation: boolean = false;

  states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'MI', 'GA', 'NC'];

  onSearch() {
    console.log('Form submitted with:', { street: this.street, city: this.city, state: this.state });
  }

  onClear() {
    this.street = '';
    this.city = '';
    this.state = '';
    this.useCurrentLocation = false;
  }
}
