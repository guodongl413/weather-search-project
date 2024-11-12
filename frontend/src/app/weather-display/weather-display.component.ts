import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-weather-display',
  templateUrl: './weather-display.component.html',
  styleUrls: ['./weather-display.component.css'],
  standalone: true, // 添加此行
  imports: [CommonModule]  // 添加 CommonModule
})
export class WeatherDisplayComponent {
  @Input() dailyData: any;
  @Input() hourlyData: any;
}

